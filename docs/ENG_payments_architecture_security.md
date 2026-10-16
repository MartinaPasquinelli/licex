# Payments, Architecture, and Security

## 1. Payment and Sales on RGB

**Components**

- **License asset:** A UDA with a metadata hash, transferability policy, and issuer signature. No activation code or document is included in the contract.
- **Payment asset:** A stable RGB asset (e.g., USDT on RGB, if available in the selected wallet) to avoid volatility between the offer and settlement. _Assumption to be verified._
- **Signed price list:** The company publishes offers signed with its own key; the server acts as an index and coordination layer and does not handle funds or keys.
- **WDK wallet on the user's device:** Signs only after explicit confirmation of the transaction summary (amount, asset, recipient, and fees).

**How the purchase works**

| Mechanism                                                    | Description                                                                                                                                                                    | Status                                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Atomic swap (primary)                                        | The transfers of both contracts (license and payment) are committed within the same Bitcoin transaction, so they either both occur or neither does.                            | Assumption to be validated (spike S2).                                                                                                       |
| 2-of-3 escrow (alternative)                                  | Buyer, company, and arbitrator: payment is released upon license delivery or at expiration.                                                                                    | Assumption to be validated (S4).                                                                                                             |
| Payment followed by delivery (fallback, primary market only) | The buyer pays; the company transfers the license within a stated timeframe, subject to a refund policy. The buyer's risk is not eliminated and is displayed in the interface. | Always available for the primary market. **Not permitted for peer-to-peer resale**, where there is no company obligated to refund the buyer. |

A flow that is not atomic must never be presented as atomic.

**Proof of holding.** To activate the software, the holder signs a challenge using the key linked to the asset's RGB seal. The company, which created the contract, can validate the asset's state using its own stash and grant access: activation follows the token. How to provide proof without revealing more history than necessary is the subject of spike S3.

**Off-chain secrets.** If the company's system still requires a code, it is not included in the swap: after payment, the company encrypts it with the buyer's public key and publishes its commitment (a hash, preferably salted) in the metadata. When ownership changes, the company issues a new encrypted code for the new holder and invalidates the previous one (see 5.1). For this reason, the secret must never be stored inside the asset, where it would remain visible to all future holders.

**LICEX fee.** Included in the same swap and displayed in the transaction summary. In a resale, the issuer's royalty is added if applicable.

**Refunds and revocation.** The company defines the refund policy; a refund is a reverse payment initiated by the company. Revocation is managed in the company's registry: the asset remains in the wallet, but activation is denied and the `license_status` state becomes `revoked` in the interface. Whether the RGB contract can support on-chain revocation must be assessed in S1. A refund to the original buyer after a resale is not provided for: the latest holder has the same refund rights only if the company's policy explicitly grants them.

### 1.1 Peer-to-Peer Resale (Secondary Market)

Principle: **the RGB asset proves ownership; the company decides whether ownership grants access.** The flow follows the same rules as a primary sale (the token follows the right, no on-chain secrets, explicit confirmation for every signature) and adds the change of ownership.

| Stage                  | What happens                                                                                                                                                                                                                                                                                                                                         | Who decides / verifies              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1. Offer               | The holder creates a fixed-price resale offer, denominated in an accepted payment asset and signed with the key linked to the asset's seal.                                                                                                                                                                                                          | The holder.                         |
| 2. Checks              | LICEX performs deterministic checks: `transfer_policy` permits resale, the license is `active` and unexpired, no transfer is already in progress, the maximum number of transfers has not been exceeded, the minimum holding period has been met, and the offer is valid (the seal has not been spent). The result is recorded in `transfer_status`. | Code, not AI.                       |
| 3. Approval            | With `transferable_with_approval`, the company approves or rejects the offer through the Issuer Kit. A rejection blocks the offer and provides a reason.                                                                                                                                                                                             | The company.                        |
| 4. Publication         | The offer appears in the catalog as "second-hand," showing the number of previous transfers, license status, refund policy (if any), and whether a royalty applies.                                                                                                                                                                                  | System.                             |
| 5. Purchase            | The buyer sees a summary containing the price, asset, LICEX fee, issuer royalty, recipient, and residual risk, and confirms the transaction.                                                                                                                                                                                                         | The buyer.                          |
| 6. Swap                | The license and payment are exchanged within the same transaction (atomic swap, S2). Payment is split between the seller, LICEX fee, and any applicable royalty. If the swap is unsupported, escrow is used; "payment followed by delivery" is never permitted.                                                                                      | Both wallets, with confirmation.    |
| 7. Change of ownership | The new holder provides proof of holding. The company updates its registry: the new holder is registered, the previous holder is deactivated, and credentials are rotated (a new encrypted code is issued for the new holder and the previous one is invalidated). The state becomes `holder_updated`.                                               | The company through the Issuer Kit. |
| 8. Closure             | The order is marked as "completed" only once the swap is confirmed and the company has updated the holder. Before that, the status is "transfer completed, activation reassignment pending."                                                                                                                                                         | State machine.                      |

**Resale-specific rules**

1. **The previous holder loses access.** Credential rotation and deactivation of the previous identity are mandatory for every transfer. Without this guarantee, the seller could continue using the software with the key they already possess. This is why the secret must never be embedded in the asset and why proof of holding is repeated during the company's periodic checks, if any.

2. **Only one active offer per asset.** A published offer blocks other offers for the same asset and becomes invalid if the seal is spent. RGB state uniqueness prevents the same asset from being sold twice; LICEX checks prevent duplicate or superseded offers.

3. **Transparency about history.** A second-hand buyer receives the consignment (the asset's history) required for RGB validation and may therefore see technical information about previous transfers. The user is informed before confirming the purchase; no personal data about previous holders is disclosed beyond what is contained in the consignment.

4. **Declared license status.** Before publication, the offer displays whether the license is active, expired, or revoked according to the company. If the company is unreachable, the status is "unverifiable," and publication is either blocked or clearly flagged.

5. **No implicit refunds.** A second-hand offer does not inherit the refund policy of the original purchase unless the company explicitly states otherwise. Any such policy is displayed in the offer details.

6. **Disputes.** If activation is not reassigned after an approved transfer, the buyer can open a dispute. The moderator reviews the case with the company and, if escrow exists, the arbitrator decides whether to release the funds. On-chain behavior is not retroactively modified.

7. **Price.** The seller sets a fixed price. LICEX imposes neither minimum nor maximum prices, unless required by applicable law or the issuer.

_Technical assumptions to validate in S7 (and S1, S2, and S3):_ availability of the schema and APIs needed to transfer a UDA between users through WDK; the ability to include royalties and fees in the same swap; how the company receives notification of a transfer (proof of holding from the new holder or a notification accompanied by proof); and the handling of an asset transferred outside LICEX (in which case the company may not recognize it and the status remains "unconfirmed").

### 1.2 Ownership, Activation, and Key Delivery: How RGB and WDK Work Together

This section describes how **the person who owns the asset obtains access to the software and, if necessary, the key**, and how everything is updated when the license changes hands. The rules in Section 2 (three layers) and Principles 1 and 5 (the token follows the right; no secrets in the asset) apply.

**What each component does**

| Component               | Role                                                                                                                                                                                                               | What it DOES NOT do                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RGB asset (the license) | Identifies who controls the right: ownership is linked to a Bitcoin output (seal) that only the holder can spend. The transfer uses a consignment sent to the recipient, who validates it locally.                 | Does not contain the key. Does not notify the company when ownership changes: the blockchain cannot see the transfers, and the company cannot independently "look up" who owns what. |
| WDK wallet (RGB module) | Stores the user's keys on their device, receives and sends RGB assets, signs messages (the proof-of-holding challenge), and creates the encrypted backup.                                                          | Does not decide who can use the software.                                                                                                                                            |
| Company (Issuer Kit)    | Created the contract, maintains the holder registry, verifies ownership, delivers the encrypted key to the holder, rotates it whenever ownership changes, and denies access to anyone who is no longer the holder. | Does not handle the user's funds or keys.                                                                                                                                            |
| LICEX                   | Provides indexing, coordination, the interface, and company notifications about transfers completed on the platform.                                                                                               | Does not custody assets, keys, or secrets.                                                                                                                                           |

**Activation and key delivery flow (first holder)**

1. The buyer receives the asset in their wallet (through a swap or another mechanism described in Section 5).
2. The app generates a **dedicated encryption key**, distinct from the wallet key and the seal, and publishes its public key in the activation request.
3. The company sends a **challenge** (a random value with an expiration time, bound to the license and buyer). The WDK wallet signs it with the key linked to the asset and provides the minimum proof of ownership required, as determined in S3.
4. The company **verifies ownership** using its own RGB stash (it created the contract) and checks that the license is `active`.
5. If verification succeeds, the company registers the holder and delivers the secret: it **encrypts the key using the buyer's public key** and returns it, or grants access directly (session token or account) without delivering a key. The key's commitment (salted hash) is already included in the signed metadata, allowing the buyer to verify that the correct key was received.
6. The app decrypts the key locally. The key never appears in plaintext in the asset, LICEX database, or logs. `activation_status` becomes `confirmed` only after the result has been recorded by the company.

**Change of ownership and delivery of the new key**

1. The holder sells the asset (resale, Section 5.1), and the swap or escrow is completed.
2. The **new** holder initiates activation using the same procedure: challenge, signature, and ownership verification.
3. The company updates its registry: the new holder becomes active, the **previous holder is deactivated**, the old key is invalidated, and a **new key encrypted for the new holder** is issued.
4. If the transfer occurred on the platform, LICEX also notifies the company. If it occurred outside LICEX, the company discovers it only when someone requests activation; the status remains "unconfirmed" until proof is provided.
5. For software that works only online (accounts, tokens, or license servers), the previous holder's deactivation takes effect immediately. For **offline software** that accepts a perpetual key, the company cannot "revoke" a key already delivered. Periodic online verification is required, or the license must be declared unsuitable for resale (`not_transferable`).

**What can and cannot be done today** (based on documentation available as of October 2026; to be confirmed against actual code in S1–S4 and S7)

| Function                                                                                                                                          | Current status                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Issue the license asset through WDK as a non-inflationary fungible asset (NIA), e.g., an asset with supply N where each unit represents a license | Documented in the WDK RGB module. Units are interchangeable: holder identity is maintained in the company's registry.                                                             |
| Issue the license as a UDA (unique asset) through WDK                                                                                             | **Not exposed** by the released WDK module API. Only possible by accessing a lower-level RGB layer (to be verified in S1).                                                        |
| Transfer and receive RGB assets between two users (single-use invoice, consignment, transport endpoint)                                           | Documented in the WDK RGB module.                                                                                                                                                 |
| Sign a challenge using the wallet                                                                                                                 | The module exposes message signing; the format and its link to the seal must be tested in S3.                                                                                     |
| Company-side ownership verification (using the stash and consignment)                                                                             | **Not available as a ready-made function**: it must be implemented in the Issuer Kit (S3).                                                                                        |
| Atomic license-to-payment swap between two contracts                                                                                              | Not documented in the WDK on-chain module. Atomic RGB swaps exist in Lightning environments (software still in alpha) and in other projects; support in WDK must be tested in S2. |
| Deliver the encrypted key after ownership verification                                                                                            | **Feasible today**: this relies on standard cryptography and company-side logic, not on special RGB functionality.                                                                |
| Update the holder and rotate the key after resale                                                                                                 | **Feasible today** as company software; the difficult part is knowing that a transfer has occurred (see point 4 above).                                                           |
| Stable payment asset (USDT on RGB)                                                                                                                | Availability and support in the selected wallet must be verified (open decision 3).                                                                                               |

**Project implication.** The most practical approach today is to issue licenses as transferable NIA assets through WDK; maintain the holder registry and deliver encrypted keys through the Issuer Kit; implement proof of holding in S3; and use escrow or payment followed by delivery until atomic swaps have been demonstrated. UDA support and atomic swaps remain objectives to prove, not assumptions.

The WDK RGB module is maintained by the community and is not guaranteed by Tether or the WDK team. It must be treated as a dependency requiring evaluation (see Section 7). The wallet also requires a persistent local data directory: losing it invalidates RGB balances even if the seed remains valid, so encrypted backup is part of the user flow.

## 2. Requests for Missing Software with QVAC

Today, a request is merely a signal; with QVAC, WDK, and RGB, it can become a committed presale that companies can respond to.

1. Local QVAC structures the request (use cases, requirements, platform, budget), removes personal data, and searches the catalog for alternatives using local embeddings. The catalog includes second-hand offers, clearly marked as such.
2. If nothing suitable exists, the user can publish an anonymous, high-level request (category and generalized requirements), never the original text.
3. **Private aggregation:** similar requests are grouped on the device. Only categories are sent to the service, with minimum group-size thresholds and suppression of rare groups. Differential privacy noise is an option to evaluate.
4. The user can make an RGB pledge held in escrow, with a specified amount and expiration date.
5. Verified companies can view aggregated demand, committed capital, and a baseline specification (RFP) generated by QVAC from recurring requirements, and can take ownership of the request.
6. **Delivery:** upon verified release, including milestone-based releases, the funds go to the company and backers receive a native license for the new software, with an early-backer discount.
7. **Failure to deliver:** when the deadline expires, the pledge is refunded (timelock, assumption to validate in S4).

QVAC's roles include structuring and drafting requests, removing personal data, generating embeddings and matching results, clustering and deduplication, generating RFPs, and matching requests with companies based on public documentation. Suggestions are recommendations, not guarantees.

**Risks:** artificial requests (Sybil attacks) and vague specifications.

**Mitigations:** pledges have a real cost, minimum thresholds apply to both request counts and committed capital, and releases are milestone-based.

## 3. Architecture and Technologies

**Logical architecture** (non-custodial: keys and funds remain in the user's wallet)

```text
[Buyer / Reseller Client: Web UI / Desktop]
   +--> [WDK Wallet] --> [RGB Adapter] --> [Bitcoin / RGB Network]
   +--> [Local QVAC: Terms, Search, Requests]
   +--> [LICEX API] --> [PostgreSQL: Catalog, Orders, Resales, States, Audit]
            +--> [Worker: Prices, Notifications, Order and Transfer Reconciliation]

[Company Portal + Issuer Kit] --> UDA issuance, signed price list,
                                  proof of holding, transferability policy,
                                  resale approval, holder changes,
                                  credential rotation, revocation, refunds

[Authorized Price Sources]    <-- Historical data (if applicable)
```

The details of the integration between the browser, QVAC process, WDK, and RGB libraries will be decided after the technical spikes. A web app running on a server must not present an inference as local if it sends data to a remote backend.

**Candidate technology stack**

| Area                      | Candidate                           | Required verification                                                                                          |
| ------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Frontend                  | React + TypeScript + Vite           | Accessibility and integration with the wallet client.                                                          |
| Backend                   | Node.js + TypeScript, REST          | Authentication, sessions, and authorization.                                                                   |
| Database                  | PostgreSQL                          | Migrations, retention, and indexes.                                                                            |
| Local AI                  | QVAC SDK                            | Runtime, models, performance, structured output, and hardware requirements.                                    |
| Wallet                    | WDK                                 | APIs, signing, recovery, RGB compatibility, and UDA transfers between users.                                   |
| Asset                     | RGB                                 | Schema, issuance, consignment, swaps, and backups.                                                             |
| Issuer Kit                | Library + company endpoints         | Issuance, ownership verification, revocation, transferability policy, holder changes, and credential rotation. |
| Workers and notifications | Backend worker; email and/or in-app | Data sources, frequency, provider, and preferences.                                                            |
| Observability             | Structured logs and metrics         | No secrets or documents in logs.                                                                               |

**Separate modules:** Identity & Access · Company Onboarding · Listings · Resale & Transfers · Issuer Kit · AI Assistant (versioned prompts, structured output) · Wallet & RGB Adapter (the sole point of contact with the libraries, replaceable) · Orders & Escrow (no order marked "completed" before confirmation) · Price Monitoring · Wanted Software & Pledges · Demand Insights · Notifications & Audit.

**State of the art and dependencies** (to be verified during implementation)

- **Marketplaces and digital product sales:** Envato Market and Paddle demonstrate demand for online purchasing with licensing conditions; neither is built on RGB assets.
- **License management:** Keygen and LicenseSpring demonstrate that a record of ownership is not enough; the company's own system is also required. LICEX therefore introduces the Issuer Kit, which also manages changes of ownership.
- **RGB:** Assets and contracts anchored to Bitcoin, with client-side validation. Schemas for unique digital assets (UDAs) are natural candidates for identifiable licenses. An RGB asset is technically transferable by design; resale restrictions are application-level issuer rules, not protocol properties, unless S1/S7 establish otherwise.
- **WDK:** The RGB module (`@utexo/wdk-wallet-rgb`, documented version 2.0.3) is community-maintained. According to its documentation, it does not expose UDA/CFA issuance through the WDK account API, supports only one account, and provides native artifacts for only certain operating systems and architectures. It supports NIA issuance, sending and receiving assets, message signing, and encrypted backups (details in 5.2). It must be treated as a dependency requiring evaluation, with a lower-level RGB implementation as a fallback.
- **QVAC:** Local AI inference (language models, embeddings, RAG) according to the supported SDK and models. Inference is local, not the entire platform: pricing, notifications, and aggregation require network services.
- Before claiming novelty, a prior-art search and legal assessment are required.

**Assumptions and constraints**

- Companies are willing to sell licenses on RGB, adopt the Issuer Kit, and, in some cases, allow resale.
- Users are willing to use a self-custodial wallet and manage their own backups.
- QVAC cannot verify external facts without accessible evidence.
- The wallet depends on backups, network connectivity, synchronization, and correct consignment handling.
- Companies can update their holder registry and rotate credentials after a transfer; without this capability, resale is not offered for that license.

## 4. Trust, Security, and Privacy

**Main threats:** fraudulent or impersonated companies · manipulated price lists or altered prices · stolen credentials or wallet devices · loss of wallets or RGB backups · asset transferred but activation denied · duplicate purchases and orders after timeouts · exposure of activation codes or personal data · re-identification through rare aggregated requests · incorrect or overconfident AI responses · artificial requests and pledges · **resale of revoked or expired licenses presented as valid · sellers continuing to use software after resale · duplicate resale offers or offers for assets already transferred · license transfers that violate issuer rules · money laundering or wash trading through successive resales · exposure of asset history to the new buyer**.

**Countermeasures**

- **Company verification (KYB):** verify corporate details,
