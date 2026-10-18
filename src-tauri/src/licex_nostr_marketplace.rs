//! Nostr relay access for public LICEX marketplace listings.

use nostr_sdk::prelude::*;
use serde::Serialize;
use serde_json::Value;
use std::time::Duration;

use crate::{nwc, secret_store};

const SECRET_NAME_PREFIX: &str = "licex-marketplace-";
const SWAP_SECRET_NAME_PREFIX: &str = "licex-p2p-swap-";
const MARKETPLACE_HASHTAG: &str = "licex-marketplace";
const EVENT_FETCH_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceRelayEvent {
    pub event_id: String,
    pub publisher_pubkey: String,
    pub created_at: u64,
    pub payload: Value,
}

fn load_or_create_keys(account_id: i32) -> Result<Keys, String> {
    let secret_name = format!("{SECRET_NAME_PREFIX}{account_id}");
    if let Some(secret) = secret_store::get(&secret_name)? {
        return Keys::parse(&secret)
            .map_err(|error| format!("Stored LICEX marketplace key is invalid: {error}"));
    }

    let keys = Keys::generate();
    secret_store::set(&secret_name, &keys.secret_key().to_secret_hex())?;
    Ok(keys)
}

async fn connect_client(keys: Keys) -> Result<Client, String> {
    let client = Client::new(keys);
    let mut added_relays = 0;

    for relay in nwc::DEFAULT_RELAYS {
        match client.add_relay(relay).await {
            Ok(_) => added_relays += 1,
            Err(error) => log::warn!("[LICEX Nostr] failed to add relay {relay}: {error}"),
        }
    }

    if added_relays == 0 {
        return Err("No LICEX marketplace relays could be configured".to_string());
    }

    client.connect().await;
    Ok(client)
}

fn event_identifier_from_payload(payload: &Value) -> Result<String, String> {
    if payload.get("version").and_then(Value::as_u64) != Some(1) {
        return Err("Unsupported LICEX marketplace payload".to_string());
    }

    match payload.get("schema").and_then(Value::as_str) {
        Some("licex-marketplace-listing") => {
            if !matches!(
                payload.get("status").and_then(Value::as_str),
                Some("published" | "withdrawn")
            ) {
                return Err(
                    "Marketplace listing status must be published or withdrawn".to_string(),
                );
            }

            let listing_id = payload
                .get("listing")
                .and_then(|listing| listing.get("id"))
                .and_then(Value::as_str)
                .filter(|id| !id.trim().is_empty())
                .ok_or_else(|| "Marketplace listing is missing its ID".to_string())?;
            Ok(format!("licex-marketplace:{listing_id}"))
        }
        Some("licex-marketplace-resale") => {
            let offer = payload
                .get("offer")
                .ok_or_else(|| "Marketplace resale offer is missing its data".to_string())?;
            if !matches!(
                offer.get("status").and_then(Value::as_str),
                Some("active" | "completed" | "cancelled")
            ) {
                return Err(
                    "Marketplace resale offer status must be active, completed or cancelled".to_string(),
                );
            }

            let offer_id = offer
                .get("id")
                .and_then(Value::as_str)
                .filter(|id| !id.trim().is_empty())
                .ok_or_else(|| "Marketplace resale offer is missing its ID".to_string())?;
            Ok(format!("licex-resale:{offer_id}"))
        }
        Some("licex-marketplace-purchase-request") => {
            let request = payload
                .get("request")
                .ok_or_else(|| "Marketplace purchase request is missing its data".to_string())?;
            if request.get("status").and_then(Value::as_str) != Some("pending") {
                return Err("Marketplace purchase request status must be pending".to_string());
            }
            for field in ["offerId", "buyerNpub", "buyerNodePubkey"] {
                if request
                    .get(field)
                    .and_then(Value::as_str)
                    .filter(|value| !value.trim().is_empty())
                    .is_none()
                {
                    return Err(format!("Marketplace purchase request is missing {field}"));
                }
            }
            let request_id = request
                .get("id")
                .and_then(Value::as_str)
                .filter(|id| !id.trim().is_empty())
                .ok_or_else(|| "Marketplace purchase request is missing its ID".to_string())?;
            Ok(format!("licex-purchase-request:{request_id}"))
        }
        Some("licex-marketplace-purchase-result") => {
            let result = payload
                .get("result")
                .ok_or_else(|| "Marketplace purchase result is missing its data".to_string())?;
            if result.get("status").and_then(Value::as_str) != Some("completed") {
                return Err("Marketplace purchase result status must be completed".to_string());
            }
            for field in ["requestId", "offerId", "buyerNpub", "buyerNodePubkey", "sellerNpub"] {
                if result
                    .get(field)
                    .and_then(Value::as_str)
                    .filter(|value| !value.trim().is_empty())
                    .is_none()
                {
                    return Err(format!("Marketplace purchase result is missing {field}"));
                }
            }
            let request_id = result
                .get("requestId")
                .and_then(Value::as_str)
                .filter(|id| !id.trim().is_empty())
                .ok_or_else(|| "Marketplace purchase result is missing its request ID".to_string())?;
            Ok(format!("licex-purchase-result:{request_id}"))
        }
        _ => Err("Unsupported LICEX marketplace payload".to_string()),
    }
}

pub fn identity(account_id: i32) -> Result<String, String> {
    load_or_create_keys(account_id)?
        .public_key()
        .to_bech32()
        .map_err(|error| format!("Failed to encode LICEX marketplace identity: {error}"))
}

pub fn delete_identity(account_id: i32) -> Result<(), String> {
    secret_store::delete(&format!("{SECRET_NAME_PREFIX}{account_id}"))
}

fn swap_secrets_name(account_id: i32) -> String {
    format!("{SWAP_SECRET_NAME_PREFIX}{account_id}")
}

fn validate_offer_id(offer_id: &str) -> Result<(), String> {
    if offer_id.is_empty()
        || !offer_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
    {
        return Err("Invalid LICEX P2P offer ID".to_string());
    }

    Ok(())
}

fn load_swap_secrets(account_id: i32) -> Result<std::collections::HashMap<String, String>, String> {
    let name = swap_secrets_name(account_id);
    let Some(raw) = secret_store::get(&name)? else {
        return Ok(std::collections::HashMap::new());
    };
    serde_json::from_str(&raw)
        .map_err(|error| format!("Stored LICEX P2P swap secrets are invalid: {error}"))
}

pub fn save_swap_secret(account_id: i32, offer_id: &str, secret: &str) -> Result<(), String> {
    validate_offer_id(offer_id)?;
    let mut secrets = load_swap_secrets(account_id)?;
    secrets.insert(offer_id.to_string(), secret.to_string());
    let serialized = serde_json::to_string(&secrets)
        .map_err(|error| format!("Failed to serialize LICEX P2P swap secrets: {error}"))?;
    secret_store::set(&swap_secrets_name(account_id), &serialized)
}

pub fn get_swap_secret(account_id: i32, offer_id: &str) -> Result<Option<String>, String> {
    validate_offer_id(offer_id)?;
    Ok(load_swap_secrets(account_id)?.remove(offer_id))
}

pub fn delete_swap_secret(account_id: i32, offer_id: &str) -> Result<(), String> {
    validate_offer_id(offer_id)?;
    let mut secrets = load_swap_secrets(account_id)?;
    secrets.remove(offer_id);
    if secrets.is_empty() {
        secret_store::delete(&swap_secrets_name(account_id))
    } else {
        let serialized = serde_json::to_string(&secrets)
            .map_err(|error| format!("Failed to serialize LICEX P2P swap secrets: {error}"))?;
        secret_store::set(&swap_secrets_name(account_id), &serialized)
    }
}

pub fn delete_all_swap_secrets(account_id: i32) -> Result<(), String> {
    secret_store::delete(&swap_secrets_name(account_id))
}

pub async fn publish(account_id: i32, payload: Value) -> Result<String, String> {
    let identifier = event_identifier_from_payload(&payload)?;
    let content = serde_json::to_string(&payload)
        .map_err(|error| format!("Failed to serialize marketplace listing: {error}"))?;
    let keys = load_or_create_keys(account_id)?;
    let client = connect_client(keys).await?;

    let builder = EventBuilder::new(Kind::ApplicationSpecificData, content)
        .tag(Tag::identifier(identifier))
        .tag(Tag::hashtag(MARKETPLACE_HASHTAG));
    let result = client
        .send_event_builder(builder)
        .await
        .map_err(|error| format!("Failed to publish marketplace listing: {error}"));
    client.shutdown().await;

    let output = result?;
    if output.success.is_empty() {
        return Err("No Nostr relay accepted the marketplace listing".to_string());
    }

    Ok(output.id().to_hex())
}

pub async fn fetch(account_id: i32) -> Result<Vec<MarketplaceRelayEvent>, String> {
    let keys = load_or_create_keys(account_id)?;
    let client = connect_client(keys).await?;
    let filter = Filter::new()
        .kind(Kind::ApplicationSpecificData)
        .hashtag(MARKETPLACE_HASHTAG);
    let result = client.fetch_events(filter, EVENT_FETCH_TIMEOUT).await;
    client.shutdown().await;

    let events =
        result.map_err(|error| format!("Failed to fetch marketplace listings: {error}"))?;
    Ok(events
        .into_iter()
        .filter_map(|event| {
            let payload: Value = serde_json::from_str(&event.content).ok()?;
            let expected_identifier = event_identifier_from_payload(&payload).ok()?;
            let publisher_pubkey = event.pubkey.to_bech32().ok()?;
            if event.tags.identifier() == Some(expected_identifier.as_str()) {
                Some(MarketplaceRelayEvent {
                    event_id: event.id.to_hex(),
                    publisher_pubkey,
                    created_at: event.created_at.as_secs(),
                    payload,
                })
            } else {
                None
            }
        })
        .collect())
}
