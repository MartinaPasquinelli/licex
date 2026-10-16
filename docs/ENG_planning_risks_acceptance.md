# Planning, Risks, and Acceptance

## 1. Definition of Ready and Definition of Done

**Ready.** A story can enter a sprint if it has a clear objective and value, can be completed within one sprint, has verifiable acceptance criteria, known dependencies and risks, sufficiently defined UX/API/data requirements, explicit security and privacy requirements, available data or mocks, and a shared estimate (or an agreed-upon spike).

**Done.** A story is considered complete when:

- The code has been integrated through a reviewed pull request, and the relevant tests pass.
- Acceptance criteria have been verified; APIs and migrations are documented and versioned.
- No secrets or sensitive data appear in logs; major errors and edge cases are handled.
- The flow is keyboard-accessible, and technical documentation is up to date.
- The demo can be reproduced in the development environment, and known limitations are documented rather than hidden from the user.

**Additional requirements for wallet/RGB:** tests for errors, timeouts, recovery, and reconciliation.

**Additional requirements for AI:** uncertainty cases, invalid outputs, and malicious documents.

**Additional requirements for resale:** tests covering changes of ownership (new holder activated, previous holder deactivated, credentials rotated), company rejection, and a seal being spent while an offer is active.

## 2. Agile Plan and Spikes

A lightweight Scrum process with two-week sprints, a visible backlog, sprint reviews, and retrospectives. For a one-person team, the artifacts are retained while ceremonies are reduced (weekly planning, demo-based reviews, and brief retrospectives). Actual durations depend on team size, familiarity with RGB/WDK, and the outcome of Sprint 0.

**MVP as a thin end-to-end slice.** A single complete workflow with one demo company, rather than many superficial features:

1. The demo company registers, is verified, and publishes a license issued as a UDA, with a declared transferability policy.
2. The buyer purchases it through an atomic swap using a stable RGB asset (or escrow if the swap has not been demonstrated).
3. The buyer provides proof of holding, and the demo company activates the software.
4. In parallel, a software request follows the workflow: local QVAC → private aggregation → escrow pledge → simulated delivery → license distribution to backers or refund.
5. After steps 1–3 have been demonstrated, the holder resells the license to a second user. The demo company updates the holder and rotates credentials (Sprint 6).

If this workflow works, the concept is demonstrated; the remaining features (reports, comparisons, and additional companies) can be added later. Resale is a subsequent phase because it reuses the primary sale's swap and proof-of-holding mechanisms. The secondary market must not open until the primary sale has been proven.

**Mandatory spikes** (nothing that depends on RGB, WDK, or QVAC should be taken for granted).

| Spike | Question                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1    | WDK + RGB module: UDA issuance, stable payment asset, transfers and receipts, and possible on-chain revocation? If not, which library should be used?                                                                                                                                             |
| S2    | Atomic swap: can two RGB contracts be committed within the same transaction, with off-chain exchange of the partially signed transaction? Does it also work between two private individuals?                                                                                                      |
| S3    | Proof of holding: how can ownership of an asset be demonstrated to the company (state disclosure + challenge signature) while revealing the minimum necessary information?                                                                                                                        |
| S4    | 2-of-3 escrow and refunds using a timelock on RGB seals, for protected payments and pledges.                                                                                                                                                                                                      |
| S5    | QVAC: embeddings, clustering, personal-data redaction, and license-term extraction on the device, including execution times and hardware requirements.                                                                                                                                            |
| S6    | Legal and tax matters: platform role, invoicing and taxes, withdrawal rights for digital content, crypto-asset regulations, and anti-money-laundering requirements.                                                                                                                               |
| S7    | Resale: transferring a UDA between two users through WDK; how the company learns about the new holder; registry updates and credential rotation; swaps with multiple recipients (seller, fee, royalty); legal assessment of resale rights (exhaustion of rights) for eligible license categories. |

**Sprints**

| Sprint                                 | Objective                                                       | Main scope                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Discovery                          | Eliminate uncertainties that could invalidate the architecture. | Repository, conventions, CI; spikes S1–S7 (at least the preliminary technical investigation for S7); demo company with verification, activation, and holder-change endpoints; risk matrix and ADRs. Exit criterion: documented decision on whether to proceed with WDK RGB, use a lower-level adapter, or reduce scope.                                                                |
| 1 — Catalog and Accounts               | Browse a catalog of demo licenses.                              | Frontend/backend setup, database schema (including holder and transferability models), authentication and roles, company onboarding and verification, search and details, CI, initial API documentation.                                                                                                                                                                               |
| 2 — Issuance and Purchase              | Complete the end-to-end sales workflow.                         | Issuer Kit, UDA issuance with `transfer_policy` (US-29), signed price list, transaction summary and confirmation, swap (or escrow), proof of holding and demo activation, state machine, error and reconciliation tests. If feasibility is not established, no real transaction is simulated: the UI remains clearly labeled as a demo, and removal of the blocker is planned.         |
| 3 — Listings and Assistant             | Publish listings with QVAC assistance.                          | Listing wizard, QVAC integration, validated JSON, moderator review, refunds and revocations, audit log.                                                                                                                                                                                                                                                                                |
| 4 — Requests and Pledges               | Implement the QVAC workflow for missing software.               | Local requests, private aggregation, matching, notifications, consent, escrow pledges, simulated delivery and refunds.                                                                                                                                                                                                                                                                 |
| 5 — Watchlist, Pricing, and Refinement | Provide value even before the market reaches scale.             | Watchlist, history and alerts for internal listings, purchase history, privacy and access tests, recovery.                                                                                                                                                                                                                                                                             |
| 6 — Secondary Market                   | Enable peer-to-peer resale with the demo company.               | Holder changes and credential rotation (US-30), resale offers (US-31), second-hand purchases (US-32), company approval (US-33), royalties (US-34), disputes (extended US-27), end-to-end and privacy tests. **Prerequisites:** successful outcomes for S2, S3, and S7, plus legal advice under S6/S7. Otherwise, licenses remain `not_transferable`, and the UI does not offer resale. |

**Next phase:** advanced semantic recommendations, sales reports for companies, additional companies and integrations, authorized external price sources, natural-language search, scalability and observability, and expansion of the secondary market to more companies and license categories.

**Cross-cutting technical backlog**

- TECH-01/02: repository, branching, code style, PR template, CI pipeline (lint, test, build).
- TECH-03/04: API error conventions and redacted logging; migrations and demo seed data.
- TECH-05: threat analysis and risk register.
- TECH-06: demo company and Issuer Kit with APIs for ownership verification, holder changes and credential rotation, revocation, and refunds.
- TECH-07: state machine for orders, escrow, and transfers, with idempotency.
- TECH-08: accessibility tests and checklist; privacy policy and consent model.
- TECH-09: ADRs at `docs/adr/ADR-XXXX-title.md` (context, alternatives, decision, consequences, date).
- TECH-10: resale anomaly-detection rules (frequency, amounts, links between wallets) for moderator review.

## 3. Test Plan

- **Unit tests:** field validation, allowed and forbidden state transitions (including `transfer_status`), alert thresholds, attribute normalization, QVAC JSON output validation, authorization, fee and royalty calculations, and resale eligibility checks (policy, number of transfers, minimum holding period, license status).

- **Integration tests:** APIs and database, QVAC and license-term parser, WDK/RGB adapter, swaps and escrow, Issuer Kit (including holder changes), price sources and scheduler, notifications.

- **End-to-end tests:**
  - Company registration → verification → issuance → listing.
  - Buyer → search → summary → swap → proof of holding → activation.
  - Refund and revocation.
  - Watchlist → price change → notification.
  - Software request → aggregation → pledge → delivery or refund.
  - Consent disabled → no requests exposed to companies.
  - **Holder → resale offer → approval (if required) → swap → new holder → proof of holding → holder updated → previous holder loses access.**
  - License marked `not_transferable` → resale not offered.
  - Offer with a spent seal → invalidated.
  - Resale rejected by the company.
  - Transfer outside LICEX → status "unconfirmed."

- **AI tests:** a controlled dataset containing complete and incomplete license terms, ambiguous clauses (including assignment and transfer restrictions), similar names or versions, documents scanned with imperfect OCR, text attempting to instruct the model, and cases where the correct answer is "information unavailable." Precision, coverage, false positives, false negatives, and the ability to express uncertainty are measured separately. No single "reliability" metric is used.

## 4. Main Risks

| Risk                                                           | Impact      | Mitigation                                                                                                                                                                            |
| -------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RGB asset transferred but software not activated               | Very high   | Proof of holding and company registry; status "unconfirmed" when integration is missing.                                                                                              |
| Legal, tax, or consumer-protection issues                      | Very high   | Professional review before launch; define the non-custodial role; spike S6.                                                                                                           |
| Resale prohibited by law or license terms for certain licenses | Very high   | Legal opinion (S6/S7) before opening the secondary market; allow only validated license categories; default to `not_transferable`.                                                    |
| Seller continues using the software after resale               | High        | Mandatory credential rotation; no secrets in the asset; repeated proof of holding if required; single authoritative holder registry.                                                  |
| WDK/RGB does not support swaps, UDAs, or escrow as expected    | High        | Spikes S1–S4 and S7; replaceable adapter; fallback to a lower-level RGB implementation, escrow, or payment followed by delivery (primary market only); no promises before validation. |
| Fake or impersonated company                                   | High        | KYB verification, proof of domain and key control, signed price lists, suspension, and auditing.                                                                                      |
| Few companies willing to sell through RGB or allow resale      | High        | Start with one partner company; keep the Issuer Kit simple; communicate clear benefits (distribution channel, registry, payments, royalties).                                         |
| QVAC misinterprets license terms, including assignment clauses | High        | Source references, company confirmation, explicit uncertainty; AI cannot publish listings autonomously.                                                                               |
| Low initial liquidity                                          | High        | Narrow catalog and specific use case; no promise of a universal marketplace; secondary market opens only after the primary market is validated.                                       |
| Privacy breach in aggregated requests                          | High        | Local processing, separate consent, minimum thresholds, suppression of rare groups.                                                                                                   |
| Asset history exposed to the new buyer                         | Medium/high | Disclosure before confirmation; minimize consignment data according to S3; no additional personal data.                                                                               |
| Loss of wallet/RGB data                                        | High        | Supported procedures, backup and recovery tests, clear explanation of user responsibilities.                                                                                          |
| Inconsistent order state after a timeout                       | High        | Idempotency, state machine, reconciliation, audit.                                                                                                                                    |
| Money laundering or wash trading through resales               | High        | Frequency limits, anomaly-detection rules, moderator review, anti-money-laundering advice (S6).                                                                                       |
| Duplicate offers or offers for assets already transferred      | Medium/high | One offer per asset, invalidation when the seal is spent, company-side state verification.                                                                                            |
| Fake pledges or vague specifications                           | Medium/high | Real cost for pledges, minimum request and capital thresholds, milestone-based releases.                                                                                              |
| Price data unavailable                                         | Medium/high | Start with internal listings and authorized sources.                                                                                                                                  |
| Company suggested for a request is unsuitable                  | Medium      | Display reasoning and limitations; the company decides whether to proceed.                                                                                                            |

## 5. Open Decisions (to be resolved in Sprint 0)

1. Application type: pure web, desktop, or web UI with a local service for QVAC and the wallet (the latter simplifies local inference and wallet integration).
2. RGB representation: UDA or custom schema; what belongs in the contract state versus off-chain; possibility of on-chain revocation.
3. Payment asset and network for the demo, depending on actual WDK support.
4. Swap and escrow: which mechanism is genuinely supported; who acts as arbitrator and how they are selected.
5. Demo company: identity and available APIs for ownership verification, activation, revocation, refunds, and holder changes.
6. Who can sell: manufacturers only or authorized resellers as well; what evidence of authorization is required.
7. Local QVAC: models, runtime, hardware requirements, and behavior without a GPU or with limited memory.
8. Pricing: internal listings only or authorized external sources as well.
9. Consent and retention: how long requests and data are stored, and how consent withdrawal is handled.
10. Legal scope: jurisdiction, eligible software categories, VAT and invoicing.
11. Pilot users and initial use case.
12. **Resale:** which license categories may be transferable (perpetual? time-limited?) based on the legal opinion; default policy (`not_transferable` or another option); who pays the royalty and how it is split with the LICEX fee; frequency and transfer-count limits.
13. **Resale:** how the company receives ownership-change information (proof of holding from the new holder, signed notification) and how it handles transfers occurring outside LICEX.
14. **Resale:** whether private sellers must be identified and at what verification level, and which anti-money-laundering and tax obligations apply to LICEX.
15. **Resale:** whether to allow payment followed by delivery or require swaps/escrow only (the document proposes excluding the former); who arbitrates peer-to-peer disputes.

## 6. MVP Acceptance Criteria

The MVP is ready for a technical demo when:

- The sales workflow (Section 13) works end-to-end with a demo company, or the UI is clearly labeled as a simulation and the technical blocker is documented.
- The wallet never signs without explicit confirmation, and the fee is shown in the transaction summary.
- A company can register, be verified by a moderator, and publish a listing with the QVAC assistant, including structured output, uncertainty, and sources.
- The system distinguishes company verification, issuer signature, payment, RGB asset, and activation.
- Every issued license declares its `transfer_policy` (even if only `not_transferable`), and the company registry supports holder changes, even if the secondary market is not yet active.
- A software request moves from local QVAC through private aggregation and, with consent, to an escrow pledge with delivery or refund.
- Watchlists and alerts work for internal listings.
- Consent to aggregation is explicit and tested; no request is exposed to companies without consent.
- Automated tests and startup instructions are available, and no activation code is published in plaintext.

**Additional acceptance criteria for the secondary-market demo (Sprint 6).** Resale is demonstrated when a holder lists a `transferable_*` license, a second user purchases it through an atomic swap (or escrow), the demo company updates the holder and rotates credentials, the previous holder loses access, and the new holder gains access. A `not_transferable` license is not offered for resale. No resale is displayed as "completed" before the holder has been updated.

**Essential condition:** a demo must not present a simple token transfer as a "completed sale" if company-side activation has not been demonstrated or explicitly marked as unverified. The same rule applies to resale.

## 7. Next Steps

1. Create the repository, `README.md`, `CONTRIBUTING.md`, and ADR template.
2. Select the demo company and define a test license with a locally functioning activation API, including holder changes and code rotation.
3. Run spikes S1–S5 and S7 before implementing the full checkout flow, and start S6 with a legal professional, including resale issues.
4. Agree on the data model, states, and company-verification rules; decide the default `transfer_policy`.
5. Implement the catalog, details, and listing creation without real transactions; then add issuance, swaps, and proof of holding.
6. Add the QVAC assistant for listings, requests, and pledges.
7. Open the secondary market (Sprint 6) only after successful outcomes for S2, S3, and S7 and completion of the legal review.
8. Test privacy, access control, recovery, and error handling; have a small group of users and one or two companies try the prototype, then review the backlog.

**Suggested repository structure** (can be simplified for an individual prototype):

```text
licex/
├── frontend/
├── backend/
├── packages/ (shared-types, wallet-rgb-adapter, issuer-kit)
├── tests/ (integration, e2e)
├── docs/ (product, architecture, adr, security, testing)
├── .github/workflows/
├── README.md
└── CONTRIBUTING.md
```

## 8. Glossary

- **RGB asset:** An asset represented and transferred using the RGB protocol according to the contract's rules.
- **UDA:** RGB schema for unique digital assets.
- **Client-side validation:** The recipient locally verifies the necessary contract-related data.
- **Consignment:** Data transferred to the recipient to verify and accept an RGB state or transfer; includes the relevant asset history.
- **Seal:** A commitment linking an RGB asset to a Bitcoin output, determining its control.
- **Proof of holding:** Proof, provided by signing a challenge, that the party requesting activation controls the asset.
- **Issuer Kit:** Company library and endpoints for issuance, ownership verification, transferability policy, holder changes, revocation, and refunds.
- **Escrow:** Funds held until a specified condition is met or a deadline expires.
- **KYB:** Verification of a company's identity and corporate details.
- **Entitlement:** The right to access or use software as recognized by the company's system.
- **Secondary market / resale:** Sale of a license already purchased by one holder to another user.
- **Transferability policy (`transfer_policy`):** Issuer-defined rule governing whether and how a license may be resold.
- **Holder change:** Update to the company's registry after a transfer: the new holder is activated and the previous holder is deactivated.
- **Credential rotation:** Issuance of a new activation code for the new holder and invalidation of the previous one.
- **Royalty:** Portion of the resale price paid to the issuer.
- **ADR:** Architecture Decision Record, a short document recording an architectural decision.
- **DoR / DoD:** Definition of Ready / Definition of Done.
- **MVP, Epic, User Story, Story Point:** Minimum verifiable product version; group of related stories; a role's need with acceptance criteria; relative estimate of complexity and uncertainty (not hours).

## 9. References

To be rechecked during implementation, as APIs and support may change.

- **RGB:** Documentation · Supported schemas · Schema concepts · Contract transfers.
- **WDK:** Overview · Wallet modules · RGB module · API reference · Account and storage management.
- **QVAC:** SDK · Ecosystem · CLI.
- **Licensing and marketplaces:** Keygen · Keygen Licenses API · LicenseSpring · Paddle · Envato Market — User Terms.

_This document does not replace a legal review, a definitive technical specification, or a patent search. The first priority is to demonstrate that the narrow workflow is both legally permissible and technically feasible: a company-issued license, an RGB exchange using a WDK wallet, and activation that follows the token. Only then should peer-to-peer resale be introduced, with the issuer's consent._
