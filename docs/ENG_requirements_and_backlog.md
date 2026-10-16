# Requirements and Backlog

## 1. Epics and User Stories

MoSCoW priorities: Must (essential for the MVP), Should, Could. Estimates are relative story points (SP), to be reviewed during planning. Each acceptance criterion applies together with the rules in Sections 2, 5, and 8; stories that depend on unproven RGB/WDK capabilities are contingent on the relevant spikes.

### E1 — Accounts and Privacy

**US-01 Registration and Login** (Must, 5 SP) — As a user, I want to register, authenticate, and log out to protect my data.

- A valid email address creates a unique account; an already-used email address returns an understandable error without revealing unnecessary information.
- Valid credentials start a session; invalid credentials do not. Logging out invalidates the session. Privileged operations enforce permissions on the server side. No passwords are stored in plain text.

**US-02 Privacy Preferences** (Must, 3 SP) — As a user, I want to decide whether my requests contribute to aggregated statistics.

- Consent to aggregation is separate from the general terms; its version and timestamp are recorded, and it can be withdrawn for future uses.
- Without consent, requests are never sent to companies.

### E2 — Companies and Licenses

**US-03 Company Onboarding and Verification** (Must, 8 SP) — As a company, I want to register and be verified so that I can sell licenses.

- Company details, proof of domain control, and proof of control over the signing key are required. The moderator can approve, reject, or request additional information, with the reason recorded.
- Only a verified company can publish listings; the `company_status` is visible to buyers.

**US-04 Issue Licenses as RGB Assets** (Must, 13 SP, contingent on spike S1) — As a company, I want to issue licenses as UDAs containing metadata hashes and my signature through the Issuer Kit.

- The spike demonstrates issuance, storage, transfer, and receipt in a controlled environment using the selected library.
- The asset contains no keys or documents in plain text. If WDK does not support the required schema, the alternative must be documented in an ADR before proceeding.
- The signed metadata includes the transferability policy (US-29).

**US-05 Create a Listing with the QVAC Assistant** (Must, 8 SP) — As a company, I want to publish a license with its price and terms, with QVAC helping extract information from my license terms.

- Where possible, QVAC extracts the product, edition, version, duration, platforms, and relevant clauses (including assignment and transfer clauses) from the terms text, with references to the original passages.
- It flags ambiguities and missing fields without inventing values. The company reviews and confirms the results; the outcome is labeled “AI analysis.”
- Minimum required fields must be provided; drafts can be saved, but incomplete listings cannot be published.

**US-06 Listing Review** (Should, 5 SP) — As a moderator, I want to review new or flagged listings before they become visible.

- I can view checks and reports and approve, reject, or suspend listings. Every decision is recorded with the responsible person and reason.

### E3 — Catalog

**US-07 Search for Licenses** (Must, 5 SP) — As a buyer, I want to search by name, category, publisher, version, and price.

- Free-text search and filters are available. Results show the product, edition/version, price, verified company, and license type.
- When a secondary market exists, a “new / second-hand” filter is available; second-hand offers are always clearly identifiable.
- If no results are found, the system suggests creating a software request.

**US-08 License Details** (Must, 3 SP) — As a buyer, I want to view the terms, refund policy, and seller status to evaluate a purchase.

- The page displays the description, duration, platforms, refund policy, transferability policy, available payment mechanism, and the statuses defined in Section 2. Missing information is explicitly indicated.

**US-09 Compare Alternatives** (Should, 5 SP) — As a buyer, I want to compare similar products based on my budget and needs.

- Alternatives are based on features, platforms, price, and intended use. Each includes a rationale, and unknown attributes are flagged. The user can adjust the criteria.

### E4 — Purchase and Activation

**US-10 Summary and Confirmation** (Must, 5 SP) — As a buyer, I want to see the price, asset, recipient, fees, and residual risk before confirming a purchase.

- Explicit user action is required; no transaction is signed merely because QVAC recommends it.

**US-11 Atomic License ↔ Payment Swap** (Must, 13 SP, contingent on spike S2) — As a buyer, I want to exchange payment and an RGB license atomically.

- The following states are visible: prepared, pending, sent, received, validated, failed, and requiring reconciliation. An order must never be marked “completed” solely on the basis of the UI or AI.
- Errors, timeouts, and restarts must not create duplicate orders.
- If atomic swaps are unsupported, escrow or pay-then-deliver is used (the latter only in the primary market), and the limitation is disclosed in the summary.

**US-12 Payment with Delivery Guarantee** (Should, 13 SP, contingent on spike S4) — As a buyer, I want my payment to be protected when a swap is unavailable.

- Escrow with release upon delivery or at expiration; a refund is issued if delivery does not occur. An arbitrator intervenes only in the event of a dispute.

**US-13 Proof of Holding and Activation** (Must, 8 SP, contingent on spike S3) — As a license holder, I want to activate the software by proving that I own the asset.

- The company verifies the proof and records the outcome, including the registered holder. Without an integration, the status is “unconfirmed” and manual steps are displayed.
- A license must not be marked “activated” without adequate proof.

**US-14 Refunds and Revocation** (Should, 5 SP) — As a company, I want to manage refunds and revocations through the portal.

- A refund is a reverse payment requiring explicit confirmation. Revocation updates the registry and the status shown to the buyer. Every action is recorded in the audit log.
- Refunds and revocations take the current holder and transfer history into account.

**US-15 Purchase History and Receipts** (Should, 3 SP) — As a buyer, I want to retrieve my licenses and receipts.

- The list includes activation status. Receipts show the amount, asset, fee, and company. Sensitive data is displayed only to the holder.
- Resold licenses remain in the history with the status “transferred,” without further access to the software.

### E5 — Watchlist and Prices

**US-16 Watchlist** (Must, 2 SP) — As a buyer, I want to save a license so I can find it again.

- Items can be added and removed; the watchlist is private.

**US-17 Price Alerts** (Must, 5 SP) — As a buyer, I want to receive a notification when the price falls below a threshold.

- The threshold and notification channel are configurable. Data comes from declared sources, with stale data clearly identified. Duplicate notifications for the same price change are prevented.

**US-18 Price History** (Should, 5 SP) — As a buyer, I want to consult price history to evaluate whether an offer is worthwhile.

- The chart distinguishes recorded data, intervals with no data, and estimated values. It identifies the source and time period and does not invent historical data from before collection began.
- Prices for second-hand offers are displayed separately from primary-market prices.

### E6 — Missing Software

**US-19 Describe Wanted Software** (Must, 5 SP) — As a user, I want to describe software I cannot find, with local QVAC structuring the request and removing personal data.

- Description, use case, operating system, requirements, and optional budget are supported. The user must confirm the summary proposed by QVAC; the request can be edited and deleted.
- The request remains private (including being stored locally only) or is saved on the service with a clear privacy notice.

**US-20 Matches and Alternatives** (Must, 5 SP) — As a user, I want to be notified when a similar product becomes available.

- New listings are compared against the request, including second-hand listings clearly marked as such. Each match includes a rationale and identifies requirements that are unmet or unknown. Users can provide relevance feedback; notifications respect preferences and consent.

**US-21 Private Aggregation** (Must, 8 SP) — As a consenting user, I want QVAC to group and anonymize my request on my device.

- Processing takes place only after consent. Only categories are sent to the service, subject to a minimum group-size threshold.
- No email addresses, names, or identifiable free text are transmitted. Rare categories are suppressed or generalized. The policy defines how previously aggregated data is handled after consent is withdrawn.

**US-22 Pledge for a Request** (Should, 8 SP, contingent on spike S4) — As a user, I want to commit an amount in RGB to a request for missing software.

- The amount and expiration date are explicit, funds are held in escrow, and every signature requires confirmation.

**US-23 Pledge Delivery and Refund** (Should, 8 SP) — As a backer, I want to receive the license upon delivery or a refund at expiration.

- Upon verified delivery, including milestone-based delivery where applicable, funds are transferred to the company and backers receive the native license. Pledges are automatically refunded at expiration.

**US-24 Business Opportunities and RFPs** (Could, 8 SP) — As a company, I want to review aggregated demand, committed capital, and a basic specification, and take ownership of a request.

- A summary shows aggregate request counts, use cases, recurring requirements, committed capital, and budget when sufficient data is available. QVAC generates the RFP.
- The compatibility score is indicative, not a revenue forecast. No individual users are contacted, and no development is promised.

### E7 — QVAC Assistant

**US-25 Natural-Language Search** (Should, 8 SP) — As a user, I want to ask QVAC to find products that meet my requirements.

- The request is converted into filters or structured queries. Results come from the actual catalog and include references to listings. No prices or features are invented. Actions that modify data or initiate transactions require confirmation.

**US-26 Explain License Terms** (Should, 5 SP) — As a user, I want a plain-language explanation of license clauses.

- Explanations link to the original clauses or pages and highlight ambiguities without presenting them as certainties, including clauses on assignment and transfer. The assistant clarifies that it does not replace legal advice.

### E8 — Moderation and Reporting

**US-27 Reports and Disputes** (Should, 8 SP) — As an administrator, I want to manage reports and disputes to limit fraud and resolve claims.

- Each report has a status and history. Companies or listings can be temporarily suspended according to documented policies. Actions are recorded in the audit log; an asset’s technical history is not retroactively modified.
- This includes resale disputes (activation not reassigned, invalid license, fraudulent offer), handled according to the procedure in Section 5.1.

**US-28 Company Sales Reports** (Could, 5 SP) — As a company, I want to view sales, activations, and refunds.

- Totals by period, licenses issued and activated, and refunds are available, with export functionality. No buyer personal data is exposed beyond what is necessary for activation.
- With the secondary market, reports also include resales, royalties received, and holder transfers by period.

### E9 — Secondary Market (User-to-User Resale)

**US-29 Define the Transferability Policy** (Must, 3 SP) — As a company, I want to determine whether and how my licenses can be resold.

- For each license, I choose `not_transferable` (default), `transferable_with_approval`, or `transferable_free`. I can set a royalty, maximum number of transfers, and minimum holding period.
- The policy is included in the asset’s signed metadata and displayed to buyers in the license details. It cannot be changed after issuance, except for future licenses.
- This is a Must because the policy must be decided at issuance, even if the secondary market opens later (Sprint 6).

**US-30 Holder Change and Credential Rotation** (Should, 8 SP, contingent on spikes S3 and S7) — As a company, I want the new holder to be recognized and the previous holder to lose access after a transfer.

- After the new holder’s proof of holding is verified, the Issuer Kit registry updates the holder, deactivates the previous holder, and rotates activation codes (a new encrypted code is issued to the new holder and the previous code is invalidated).
- The displayed status becomes `holder_updated` only after the update is complete. Until then, the status is “transfer completed, activation reassignment pending.”
- The operation is idempotent and recorded in the audit log. No code appears in plain text in logs.

**US-31 List a License for Sale** (Should, 8 SP, contingent on spike S7) — As a holder, I want to list an unused license at a fixed price.

- I can create an offer only if the deterministic checks (Section 5.1) pass; otherwise, I am shown the reason for failure.
- The offer is signed by my wallet with explicit confirmation. Only one active offer is allowed per asset. The offer can be withdrawn as long as no swap is in progress and becomes invalid if the seal is spent.
- Before confirming, I can see the consequences of selling: loss of access, fees, royalty, and information about the asset’s publicly visible history.

**US-32 Purchase a Second-Hand License** (Should, 13 SP, contingent on spikes S2 and S7) — As a buyer, I want to purchase a license from another user with the same guarantees as a purchase from the company, to the extent possible.

- The summary shows the price, LICEX fee, royalty, recipient, number of transfers, and residual risk; explicit confirmation is required.
- Only an atomic swap or escrow is permitted; pay-then-deliver is not allowed. If neither option is available, the offer cannot be published.
- An order is marked “completed” only after the swap is confirmed and the company has updated the holder. Errors and timeouts must not create duplicate orders.
- The offer is labeled as second-hand and indicates whether the issuer confirmed the holder change for previous transfers.

**US-33 Company Approval of Resales** (Should, 5 SP) — As a company, I want to approve or reject resales of my licenses when required by the policy.

- I can view requests with the license, holder, number of transfers, and reason, then approve or reject them with a reason. Both seller and buyer are notified.
- Rejection blocks the offer. The company may also deny activation to the new holder if the transfer took place outside the policy.

**US-34 Royalties and Resale Fees** (Could, 5 SP) — As a company, I want to receive a royalty on resales.

- Royalties and LICEX fees are calculated and distributed within the same swap, displayed in the summary, and included in reports. The calculation is covered by unit tests.
- If multi-recipient swaps are unsupported, royalties are handled through an alternative rule documented in an ADR.

## 2. Non-Functional Requirements

| Area                        | Requirement                                                                                                                                                                                    | Verification                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Security                    | Secrets, wallet keys, and activation codes must not appear in logs or be stored in plain text in the database.                                                                                 | Code review, log tests, storage verification.                               |
| Privacy                     | Only necessary data is collected; nothing is shared with companies without consent; the history of a transferred asset does not expose previous holders’ personal data beyond the consignment. | Permission and consent-flow tests.                                          |
| Transparency                | The statuses and labels defined in Section 2 are consistent across the UI and API; second-hand licenses are always identifiable.                                                               | UI and API tests.                                                           |
| Reliability                 | Retries must not duplicate orders, escrow arrangements, transfers, or holder changes.                                                                                                          | Idempotency and timeout tests.                                              |
| Holder consistency          | After a holder change, only one holder has active access; the previous holder is deactivated and their credentials invalidated.                                                                | End-to-end tests against the Issuer Kit registry.                           |
| Auditability                | Administrative actions, refunds, revocations, resale approvals, holder changes, and verification outcomes are recorded with their source and timestamp.                                        | Audit-log inspection.                                                       |
| Usability and accessibility | Clear error messages, keyboard navigation, accessible labels, and adequate contrast.                                                                                                           | User testing; automated and manual checks (keyboard and screen reader).     |
| Performance                 | Acceptable response times on the MVP dataset.                                                                                                                                                  | Thresholds to be defined after establishing a baseline, not before.         |
| Portability                 | Wallet/RGB dependencies are isolated behind an adapter.                                                                                                                                        | Adapter interface tests; documented supported platforms.                    |
| Maintainability             | Documented APIs, versioned migrations, tests, and mandatory code review.                                                                                                                       | Green CI pipeline.                                                          |
| AI correctness              | Structured, verifiable outputs with uncertainty handling.                                                                                                                                      | Test dataset, precision/recall, and edge cases.                             |
| Recoverability              | Backup and restoration of the database and wallet/RGB data.                                                                                                                                    | Restoration test.                                                           |
| Legal compliance            | Compliance with license terms, marketplace policies, and applicable regulations, including those governing software resale.                                                                    | Legal review before public release and before opening the secondary market. |

## 3. Initial Data Model

Conceptual model; the final fields will be determined during design.

| Entity                        | Main contents                                                                                                                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User                          | id, identifier/email, roles, notification and privacy preferences.                                                                                                                                                                                                                           |
| Company                       | Company details, domain, public signing key, `company_status`, refund policy, default transferability policy and royalty, approving moderator.                                                                                                                                               |
| SoftwareProduct               | Name, company, category, description, platforms, official URL, normalized attributes.                                                                                                                                                                                                        |
| LicenseListing                | Company, product, edition, version, license type and duration, price and payment asset, terms (text and hash), payment mechanism, `transfer_policy`, royalty, maximum number of transfers, minimum holding period, status (`draft`, `pending_review`, `published`, `suspended`, `rejected`). |
| RgbAssetReference             | Schema/contract, technical identifiers, issuer, issuance/transfer status, commitment (hash) to the off-chain secret, if applicable.                                                                                                                                                          |
| Order                         | Buyer, seller (company or user), company, listing, type (`primary` or `resale`), price, LICEX fee, royalty, mechanism (swap, escrow, or pay-then-deliver; the latter only for `primary`), `payment_status`, status, references to wallet/RGB operations, idempotency key, redacted error.    |
| ResaleListing                 | License (`LicenseRecord`), seller, price, payment asset, offer signature, passed/failed checks, `transfer_status`, expiration, one active offer per asset.                                                                                                                                   |
| TransferRecord                | License, previous and new holder (minimized technical identifiers), linked order, company approval, swap date, holder update date, whether credential rotation was performed, sequential transfer number.                                                                                    |
| LicenseRecord                 | Order, current registered holder, `license_status`, `activation_status`, activation date, revocation reason, number of completed transfers.                                                                                                                                                  |
| Escrow                        | Linked order or request, expiration, release condition, status, arbitrator.                                                                                                                                                                                                                  |
| PriceObservation / PriceAlert | Source, price, currency, date, freshness, type (primary or second-hand); threshold, condition, channel, last notification.                                                                                                                                                                   |
| WantedSoftwareRequest         | Structured requirements (original text only if the user chooses to save it on the service), budget, platform, `privacy_mode`, consent to aggregation, status.                                                                                                                                |
| Pledge                        | Request, amount, expiration, linked escrow, status (committed, released, refunded).                                                                                                                                                                                                          |
| DemandOpportunity             | Normalized category, count and applied threshold, recurring requirements, committed capital, RFP, score and rationale for the company; no individual identifiers.                                                                                                                            |
| AuditEvent                    | Actor, action, entity, timestamp, outcome, minimized details.                                                                                                                                                                                                                                |

The statuses defined in Section 2 apply to companies, assets, payments, licenses, activations, and transfers and must be normalized in the code and API. No entity may contain activation keys in plain text.
