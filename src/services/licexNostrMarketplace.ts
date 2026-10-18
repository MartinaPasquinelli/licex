import { invoke, isTauri } from '@tauri-apps/api/core'

import type { LicenseListing } from '../types/licex'
import type {
  NostrLicenseOffer,
  NostrMarketplaceListingPayload,
  NostrMarketplacePayload,
  NostrMarketplacePurchaseRequestPayload,
  NostrMarketplacePurchaseResultPayload,
  NostrMarketplaceResalePayload,
} from '../types/licexNostr'
import { isP2PSimulationEnabled } from './licexP2PSimulation'

interface MarketplaceRelayEvent {
  eventId: string
  publisherPubkey: string
  createdAt: number
  payload: NostrMarketplacePayload
}

export type NostrMarketplacePurchaseRequest =
  NostrMarketplacePurchaseRequestPayload['request'] & { nostrEventId: string }
export type NostrMarketplacePurchaseResult =
  NostrMarketplacePurchaseResultPayload['result'] & { nostrEventId: string }

export async function publishMarketplaceListing(
  listing: LicenseListing
): Promise<string | null> {
  if (!isTauri()) return null

  const payload: NostrMarketplaceListingPayload = {
    listing,
    schema: 'licex-marketplace-listing',
    status: 'published',
    version: 1,
  }

  return invoke<string>('licex_marketplace_publish', { payload })
}

export async function publishMarketplaceResaleOffer(
  offer: Omit<NostrLicenseOffer, 'nostrEventId'>
): Promise<string | null> {
  if (!isTauri()) return null

  const payload: NostrMarketplaceResalePayload = {
    offer,
    schema: 'licex-marketplace-resale',
    version: 1,
  }
  return invoke<string>('licex_marketplace_publish', { payload })
}

export async function publishMarketplacePurchaseRequest(
  request: NostrMarketplacePurchaseRequestPayload['request']
): Promise<string | null> {
  if (!isTauri()) return null
  const payload: NostrMarketplacePurchaseRequestPayload = {
    request,
    schema: 'licex-marketplace-purchase-request',
    version: 1,
  }
  return invoke<string>('licex_marketplace_publish', { payload })
}

export async function publishMarketplacePurchaseResult(
  result: NostrMarketplacePurchaseResultPayload['result']
): Promise<string | null> {
  if (!isTauri()) return null
  const payload: NostrMarketplacePurchaseResultPayload = {
    result,
    schema: 'licex-marketplace-purchase-result',
    version: 1,
  }
  return invoke<string>('licex_marketplace_publish', { payload })
}

export async function getMarketplaceIdentity(): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string>('licex_marketplace_identity')
}

export async function saveP2PSwapSecret(
  offerId: string,
  secret: string
): Promise<void> {
  if (!isTauri()) throw new Error('Lo swap P2P richiede l’app desktop LICEX.')
  await invoke('licex_p2p_save_swap_secret', { offerId, secret })
}

export async function getP2PSwapSecret(
  offerId: string
): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string | null>('licex_p2p_get_swap_secret', { offerId })
}

export async function deleteP2PSwapSecret(offerId: string): Promise<void> {
  if (!isTauri()) return
  await invoke('licex_p2p_delete_swap_secret', { offerId })
}

export async function fetchMarketplaceSnapshot(): Promise<{
  listings: NostrMarketplaceListingPayload[]
  offers: NostrLicenseOffer[]
  purchaseRequests: NostrMarketplacePurchaseRequest[]
  purchaseResults: NostrMarketplacePurchaseResult[]
}> {
  if (!isTauri()) {
    return {
      listings: [],
      offers: [],
      purchaseRequests: [],
      purchaseResults: [],
    }
  }

  const events = await fetchMarketplaceEvents()
  const listings = events
    .map((event) => event.payload)
    .filter(
      (payload): payload is NostrMarketplaceListingPayload =>
        payload?.schema === 'licex-marketplace-listing' &&
        payload.version === 1 &&
        (payload.status === 'published' || payload.status === 'withdrawn') &&
        typeof payload.listing?.id === 'string'
    )
  const offers = events.flatMap((event) => {
    const payload = event.payload
    if (
      payload?.schema !== 'licex-marketplace-resale' ||
      payload.version !== 1 ||
      !payload.offer ||
      (payload.offer.simulation === true && !isP2PSimulationEnabled()) ||
      !['active', 'completed', 'cancelled'].includes(payload.offer.status) ||
      typeof payload.offer.id !== 'string'
    ) {
      return []
    }

    return [{ ...payload.offer, nostrEventId: event.eventId }]
  })
  const purchaseRequests = events.flatMap((event) => {
    const payload = event.payload
    if (
      payload?.schema !== 'licex-marketplace-purchase-request' ||
      payload.version !== 1 ||
      payload.request?.status !== 'pending' ||
      (payload.request.simulation === true && !isP2PSimulationEnabled()) ||
      typeof payload.request.id !== 'string' ||
      typeof payload.request.offerId !== 'string' ||
      typeof payload.request.buyerNpub !== 'string' ||
      typeof payload.request.buyerNodePubkey !== 'string'
    ) {
      return []
    }
    return [{ ...payload.request, nostrEventId: event.eventId }]
  })
  const purchaseResults = events.flatMap((event) => {
    const payload = event.payload
    if (
      payload?.schema !== 'licex-marketplace-purchase-result' ||
      payload.version !== 1 ||
      payload.result?.status !== 'completed' ||
      (payload.result.simulation === true && !isP2PSimulationEnabled()) ||
      typeof payload.result.requestId !== 'string' ||
      typeof payload.result.offerId !== 'string' ||
      typeof payload.result.buyerNpub !== 'string' ||
      typeof payload.result.buyerNodePubkey !== 'string' ||
      typeof payload.result.sellerNpub !== 'string'
    ) {
      return []
    }
    return [{ ...payload.result, nostrEventId: event.eventId }]
  })

  return { listings, offers, purchaseRequests, purchaseResults }
}

async function fetchMarketplaceEvents(): Promise<MarketplaceRelayEvent[]> {
  if (!isTauri()) return []
  return invoke<MarketplaceRelayEvent[]>('licex_marketplace_fetch')
}
