# Vision, Model, and Objectives

## 1. Vision and Value Proposition

LICEX is a non-custodial marketplace where verified companies sell software licenses as RGB assets, and holders can resell them to other users if permitted by the issuer. Users pay with an RGB asset and receive the license in their WDK wallet. QVAC, running locally on the device, helps users understand license terms, search for products, and turn unmet needs into structured, anonymous requests that can optionally be funded at the user's discretion.

Three interconnected markets:

1. **Licenses sold by companies (primary market):** issuance, listing, search, purchase, and activation of licenses signed by the issuer.
2. **User-to-user resale (secondary market):** the holder of a transferable license lists it for sale; ownership changes through an atomic swap, and the company reassigns activation to the new holder.
3. **Software that does not yet exist:** the user describes a need, QVAC structures it and searches for alternatives. With consent, the request becomes an aggregated demand signal and, with a financial commitment, a pre-order that companies can take up.

**Problem.** People buying software online cannot always tell whether a seller is authorized or whether an activation key will work. License terms are difficult to interpret. Companies face significant overhead when collecting payments and managing licenses across different channels. People who have purchased a license they no longer use generally have no secure way to resell it. Demand for software that does not exist remains invisible.

**Value for each stakeholder**

| For                                 | Value                                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buyers                              | Verified sellers, licenses signed by the issuer, protected payments, activation tied to ownership of the asset, and license terms explained in plain language.                   |
| Selling companies                   | A sales channel accepting RGB payments, non-counterfeitable licenses, a registry of issued and activated licenses, control over resale rules, and optional royalties on resales. |
| Resellers                           | A secure way to recover value from an unused license: atomic payment, no delivery risk, and holder changes managed by the company.                                               |
| Second-hand buyers                  | A discounted license with verifiable provenance and activation reassigned by the company, rather than a copied key.                                                              |
| People looking for missing software | Private requests, suggested alternatives, and the ability to fund software that does not yet exist.                                                                              |
| Developers and companies            | Aggregated demand backed by already-committed capital, without personal data.                                                                                                    |

**Product Principles**

1. The token follows the right: activation depends on ownership of the RGB asset.
2. Verifiability before convenience: critical checks are deterministic; AI explains, extracts, and recommends but does not make decisions.
3. Non-custodial by design: LICEX does not hold users' funds or keys.
4. Privacy by default: data stays on the device; every form of sharing requires explicit consent.
5. No secrets (activation codes or keys) in plain text on-chain, in logs, or in the database.
6. Users can see the amount, asset, recipient, and fees and must confirm every signature.
7. Incremental development: first deliver a narrow, end-to-end workflow, then expand.
8. The issuer remains in control: resale is possible only if and as permitted by the company's policy, and the previous holder loses access after every holder change.

## 2. The LICEX Model: Native Licenses and Three Layers

Every license listed for sale is native: the company issues it as a unique RGB asset (UDA) containing a metadata hash and the company's own signature. This almost entirely eliminates the risk of counterfeit licenses, but an RGB transfer alone is not enough to grant access to the software. LICEX always distinguishes between three layers:

| Layer             | Question                                                            | How it is guaranteed                                            |
| ----------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| RGB asset control | Who controls the asset according to the contract's state and rules? | Client-side RGB validation; delivery of the state to the buyer. |
| Authenticity      | Was the license issued by a verified company?                       | Issuer signature and company verification (Section 8).          |
| Actual activation | Does the company's system recognize the holder and grant access?    | Proof of holding (Section 5) and the Issuer Kit registry.       |

**Transferability.** Each license declares a transferability policy (`transfer_policy`), set by the issuing company at the time of issuance and signed together with the metadata:

| Value                        | Meaning                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not_transferable`           | The license remains tied to the original buyer: the company activates only the registered holder. No resale is permitted. This is the default value.       |
| `transferable_with_approval` | The holder can resell the license, but each transfer requires company approval. The company may reject it, for example, for licensing or security reasons. |
| `transferable_free`          | The holder can resell the license freely. The company is notified and reassigns activation after the transfer.                                             |

The company can also specify a **royalty** on resales (a percentage or fixed amount included in the same swap), a maximum number of transfers, a minimum holding period before resale, and a prohibition on resale when the license has expired, been revoked, or already has a transfer in progress. These same constraints apply to the MVP: the data model and Issuer Kit support holder changes from the outset, while the secondary market will be delivered in a dedicated sprint (Section 13).

**Ownership transfer is a technical event; the transfer of rights is a company decision.** An RGB transfer of a `not_transferable` license, or of a license whose transfer has not been approved, may technically occur (the asset belongs to its holder), but the company will not reassign activation, and LICEX will neither offer nor present the transfer as valid. For this reason, resale is permitted in the interface only after the deterministic checks described in Section 5.1 have passed.

**Separate statuses (never a single `verified=true` field):**

- `company_status`: pending / verified / suspended / rejected
- `ai_review_status`: not_started / analyzed / flagged / failed (for the listing assistant only)
- `rgb_asset_status`: not_created / issued / transfer_pending / transferred / validation_error
- `payment_status`: not_started / pending / received / failed / refunded
- `license_status`: active / revoked / expired
- `activation_status`: unknown / pending / confirmed / failed / not_supported
- `transfer_status` (resale only): none / requested / approved / rejected / swap_pending / swapped / holder_updated / failed

**UI labels:** “Verified Seller” · “License Signed by Issuer” · “Payment Received” · “RGB Asset Transferred” · “Activation Confirmed” · “Resale Permitted by Issuer” · “Holder Updated by Issuer”.

No generic badges such as “100% secure” are allowed. If a verification cannot be performed, the status is “not verifiable with the available sources,” never “verified.” A second-hand license must always be identified as such and display the number of completed transfers and whether the issuer has confirmed the holder change.

## 3. Objectives, Non-Objectives, and KPIs

**MVP Objectives**

- Demonstrate an end-to-end workflow with a demo company: issue a license as a UDA, sell it, perform an atomic swap using RGB payment, verify proof of holding, and activate the license.
- Support company onboarding and verification, with a QVAC assistant that helps create listings from license terms.
- Manage missing-software requests locally using QVAC, with private aggregation and pledges held in escrow.
- Provide a watchlist and price alerts for internal listings.
- Document limitations, refunds, and sales conditions.
- Prepare the data model for the secondary market, including the transferability policy, holder registry, and credential rotation.

**Objectives for the Resale Phase (Sprint 6, after validating the primary-market workflow)**

- Demonstrate a complete holder change with the demo company: resale offer, checks, atomic user-to-user swap, registry update, credential rotation, and loss of access for the previous holder.
- Enforce the transferability policies and royalties defined by the company.

**MVP Non-Objectives**

- Resale of licenses that do not comply with the issuer's policy or that were not issued through LICEX.
- User-to-user resale without the issuing company's consent.
- Replacing companies' activation and revocation systems: LICEX provides the Issuer Kit, not a complete licensing service.
- Certifying a company's trustworthiness based solely on AI.
- Supporting every wallet, RGB schema, and operating system.
- Allowing QVAC to sign transactions or spend funds without explicit confirmation.
- Showing companies requests that can be traced to individual users or guaranteeing that a company will develop the requested software.
- A secondary market with auctions, descending-price offers, market orders, or financial instruments: resale uses a fixed price set by the seller.

**KPIs (targets to be set after establishing a baseline with real users)**

- Percentage of purchases completed using atomic swaps and automatic activation; time from purchase to activation.
- Number of companies completing onboarding and time required to publish the first listing.
- Inconsistencies correctly flagged by the assistant on a controlled test set.
- Accuracy of price alerts relative to recorded price changes.
- Number of saved software requests, percentage converted into pledges, committed capital per request, and percentage of refunds correctly processed at expiration.
- Number of companies adopting the Issuer Kit and sales volume.
- Secondary market: proportion of licenses with a transferability policy other than `not_transferable`; completed resales; time from payment to holder update; percentage of resales in which the previous holder's access is correctly revoked; royalties paid to companies.

## 4. Actors and Roles

| Actor                          | Responsibilities                                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer                          | Search, compare, purchase, retain the received asset, and activate the software.                                                                                                                                                            |
| Reselling holder               | A person who owns a transferable license and lists it for sale: sets the price, confirms the transfer signature, and loses access to the software after the holder change.                                                                  |
| Selling company                | Manufacturer or reseller authorized by the manufacturer: issues licenses, sets terms, prices, and transferability policies, receives payment and any applicable royalties, and manages activation, holder changes, revocation, and refunds. |
| Developer / interested company | Review aggregated demand and committed capital, and deliver the requested software.                                                                                                                                                         |
| Moderator / administrator      | Company verification, reports, suspensions, arbitration, auditing, and management of resale disputes.                                                                                                                                       |
| Legal / compliance             | Contracts, data protection, consumer protection, taxation and invoicing, crypto-asset and anti-money-laundering regulations, and exhaustion of rights relating to software resale.                                                          |

Application roles: Guest (public browsing), Registered User (profile, watchlist, requests, pledges, purchases, resales), Company (access to listings, the Issuer Kit, and reports after verification), and Moderator. An account may have multiple roles; authorization is always enforced on the server side.
