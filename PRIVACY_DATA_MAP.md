# Privacy data map

Required by PRD 1.2 and feeding the privacy impact assessment in PRD 16.7. Product documentation,
not a legal conclusion; counsel must confirm before launch.

## Principle

Collect only what is needed to sell and perform the audit (PRD 16.3). Default to synthetic
identities. The service tests a customer's AI system — it does not need that customer's real end-user
records to do so.

## Inventory

| Data | Subject | Purpose | Classification | Store | Default retention |
|---|---|---|---|---|---|
| Name, email, locale, timezone | Customer staff | Account and notifications | Confidential | `profiles` | Account life + 24 months |
| MFA enrolment timestamp | Customer staff | Security control evidence | Confidential | `profiles.mfa_enrolled_at` | Account life |
| Organization name, legal name, province, billing/privacy contacts | Customer org | Service delivery, invoicing | Confidential | `organizations` | Account life + accounting period |
| Membership role, project scope | Customer staff | Authorization | Confidential | `memberships` | Account life |
| Order and subscription records, provider IDs | Customer org | Billing | Confidential | `orders`, `subscriptions` | Accounting and legal requirement |
| Card data | — | — | — | **Never stored.** Hosted checkout only; card data never enters the application. | — |
| Authorization attestation: signer, version, scope, region | Customer staff | Proof of authorized testing | Confidential | `authorization_attestations` | Service + 24 months |
| Uploaded policies, FAQs, escalation paths | Customer org | Evaluation truth set | Confidential | `knowledge_sources` + private storage | Active project + 90 days |
| Captured transcripts (tester prompts, system responses) | Customer's AI system | Evidence | Confidential; Restricted if real personal data appears | `conversation_turns` | 90 days after report release |
| Screenshots and evidence files | Customer's AI system | Evidence | Confidential | `evidence_objects` + private storage | 90 days after report release |
| Findings and reports | Customer org | Deliverable | Confidential | `findings`, `reports` | Active service + 24 months |
| Support tickets | Customer staff | Support | Confidential | `support_tickets` | 24 months |
| Consent records | Customer staff / leads | Proof of consent | Confidential | `consent_records` | Duration of relationship + limitation period |
| Privacy requests | Data subject | Rights handling | Confidential | `privacy_requests` | 24 months after completion |
| Audit events | Actors | Security and accountability | Internal; Restricted metadata redacted | `audit_events` | 12 months minimum |
| Report access events | Customer staff | Access accountability | Internal | `report_access_events` | 12 months |
| Analytics events | Customer staff | Product measurement | Internal | Analytics provider | Provider default |

Retention values are the PRD 16.5 product defaults. They are not legal conclusions.

## Test identities are synthetic

The scenario library uses `TEST-` order references and `.example` / `.invalid` email domains only,
asserted by `src/domain/scenarios/library.test.ts`. Where a scenario includes a synthetic government
identifier, that is deliberate: the test is whether the customer's system correctly *refuses* it.

Real payment card and government identifier formats are detected by `src/lib/security/redaction.ts`
and are blocked from project intake unless the project carries an approved exception (FR-SCN-004).

## What is deliberately not collected

- Card numbers, CVVs or bank details — hosted payment flow only.
- Raw IP addresses on attestations — a coarse region is stored instead.
- Raw IP addresses and user agents on report access — a coarse region and client kind instead.
- Transcript content in logs, error monitoring or analytics — `redactForLog` drops
  transcript-shaped keys, and `AnalyticsProvider` accepts only scalar values.
- Uploaded filenames in analytics (PRD 19.4).

## Subprocessors

Maintain a register with purpose, data categories, processing location, DPA status, security
documentation and offboarding plan (PRD 16.10). Review annually and before adding any vendor that
receives customer content.

Expected at launch: database/auth/storage provider, payment provider, transactional email provider,
AI evaluation provider, error monitoring, hosting. **The specific vendors and their processing
locations are an open decision** — see ASSUMPTIONS.md open question 2. Cross-border transfer
disclosure and the Law 25 analysis depend on it.

## No training on customer data

Raw transcripts are never reused for model training without separate, explicit, recorded permission
(PRD 2.2). Provider settings must be configured so API content is excluded from general model
training where that option exists. Any future opt-in improvement programme requires its own consent
record — `consent_records.consent_type` already separates consent types so this cannot be bundled
into service acceptance.

## Rights handling

`privacy_requests` supports access, correction, export and deletion with identity verification, a due
date and completion evidence. The narrative field is deliberately bounded so the ticket does not
become a second copy of the sensitive data (PRD 16.6).

**The deletion job is not built.** Retention columns exist throughout the schema; nothing acts on
them yet. This is a launch blocker.

## Quebec Law 25

Serving Quebec organizations or individuals triggers additional obligations, including privacy impact
assessment requirements and specific breach handling. The PIA in PRD 16.7 must address this
explicitly before selling into Quebec — which, for a bilingual Canadian product, is the expected
case rather than an edge case.
