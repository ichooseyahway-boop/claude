# Privacy Data Map

Data inventory, purposes, retention and processing locations.

PRD refs: 16.3 (data minimization), 16.4 (classification), 16.5 (retention),
16.6 (rights), 16.7 (privacy impact assessment), 16.10 (vendor security).

> **This is a product document, not a legal conclusion.** PRD 16.5 is explicit
> that retention defaults "are product defaults, not legal conclusions" and that
> counsel and an accountant must confirm the final business retention. The
> privacy impact assessment required by 16.7 has **not** been completed.

## Classification (16.4)

| Class | Examples | Handling |
|---|---|---|
| **Public** | Marketing pages, published methodology, synthetic sample report | No restriction |
| **Internal** | Operational metrics, scenario templates, internal procedures | Internal roles only; scenario templates are not client-readable |
| **Confidential** | Customer policies, reports, findings, ordinary transcripts | Tenant-scoped, RLS enforced |
| **Restricted** | Credentials, sensitive personal data, critical evidence, breach records | Stronger access control, redacted notification, enhanced audit logging |

## Inventory

### Account and identity

| Data | Where | Purpose | Class | Retention |
|---|---|---|---|---|
| Name, email, locale, timezone | `profiles` | Authenticate and address the user | Confidential | Active account + deletion request |
| MFA enrolment timestamp | `profiles.mfa_enrolled_at` | Enforce internal MFA (FR-AUTH-002) | Confidential | With the account |
| Organization membership and role | `memberships` | Authorization | Confidential | Active membership; revocation retained for audit |
| Invitation email and token hash | `invitations` | Onboard a colleague | Confidential | Until accepted, revoked or expired |

Only the invitation token **hash** is stored; the raw token exists only in the
emailed link.

### Commercial

| Data | Where | Purpose | Class | Retention |
|---|---|---|---|---|
| Billing email, organization legal name, province | `organizations` | Invoicing and tax | Confidential | Accounting and tax requirements |
| Order and subscription records, provider IDs | `orders`, `subscriptions` | Deliver and bill the service | Confidential | Accounting and tax requirements |
| Provider webhook events | `billing_events` | Idempotent provisioning | Restricted | Payload stored by reference, not inline |

**No card data is ever collected, transmitted through, or stored by this
application.** Payment happens on the provider's hosted page (PRD 2.2).

### Audit content

| Data | Where | Purpose | Class | Retention default |
|---|---|---|---|---|
| Uploaded policies, FAQs, help content | `knowledge_sources` + object storage | Define correct answers | Confidential | Active project + 90 days |
| Prompts and responses | `conversation_turns` | Evidence for findings | Confidential | 90 days after report release |
| Screenshots and files | `evidence_objects` | Evidence | Confidential (Restricted if it captures real personal data) | 90 days after report release |
| Dimension scores, findings | `dimension_scores`, `findings` | The deliverable | Confidential | Active service + 24 months |
| Released reports | `reports` | The deliverable | Confidential | Active service + 24 months |
| Test credentials | Managed secret store | Reach the tested system | **Restricted** | Revoked at project completion or expiry |

Synthetic test identities are the default (PRD 2.2). Customers are asked not to
submit real customer personal information, and the contact form rejects
credential-shaped content outright.

### Governance

| Data | Where | Purpose | Class | Retention |
|---|---|---|---|---|
| Consent records | `consent_records` | Prove what was agreed and when | Confidential | Life of the relationship + limitation period |
| Privacy requests | `privacy_requests` | Handle access/correction/export/deletion | Confidential | Per legal requirement |
| Audit events | `audit_events` | Security and accountability | Internal | 12 months minimum |
| Report access events | `report_access_events` | Who read what, when | Internal | With the report |
| Support tickets | `support_tickets` | Service | Confidential | Active + reasonable period |
| Lead form submissions | Not yet persisted | Respond to an enquiry | Confidential | 90 days if incomplete |

Consent is stored per type and per document version, separately. Optional
marketing consent is never bundled into required service acceptance
(FR-LEGAL-001), and withdrawing it does not withdraw the consent needed to
reply to an enquiry.

## What is deliberately NOT collected

- Card numbers or payment instrument details.
- Raw IP addresses. Rate limiting uses a salted hash and stores nothing.
- User-agent strings on report access; only a coarse region field exists.
- Transcript, policy or finding content in logs, analytics or error monitoring —
  enforced by the `safeLogPayload` allowlist.
- Uploaded filenames in analytics (PRD 19.4).

## AI processing (15.7)

The evaluator receives only: the scenario objective, customer-authoritative
expected facts, the captured response, the rubric, allowed/disallowed outcomes,
the locale, relevant conversation context and redacted policy excerpts.

It does **not** receive: credentials, unrelated documents, other customers'
data, or complete policy libraries.

Provider settings must be configured so API content is not used for general
model training where the provider offers that control. Raw transcripts are never
used for model training without separate, explicit, recorded permission
(PRD 2.2).

**Status: no AI provider is configured**, so no customer content has been sent
to any model from this system.

## Subprocessors

Required by 16.10. **Not yet populated** — no vendor accounts exist. Before
launch this table must list, for each subprocessor: purpose, data categories,
processing location, contract/DPA status, security documentation and
offboarding plan.

| Subprocessor | Purpose | Data categories | Location | DPA |
|---|---|---|---|---|
| _(pending)_ | Database, auth, storage | Confidential, Restricted | TBD | TBD |
| _(pending)_ | Payments | Billing contact | TBD | TBD |
| _(pending)_ | Transactional email | Name, email | TBD | TBD |
| _(pending)_ | AI evaluation | Response text, policy excerpts | TBD | TBD |
| _(pending)_ | Error monitoring | Redacted diagnostics | TBD | TBD |

Cross-border transfer disclosure depends on the above and must be completed
before the privacy policy can be approved.

## Rights handling (16.6)

Access, correction, export and deletion are supported through
`privacy_requests`, which records receipt, scope, due date, identity
verification, actions and completion — without copying sensitive data into the
ticket narrative. Identity and authority are verified before any action.

Anything retained for legal or accounting reasons is explained to the requester
rather than silently kept.

## Outstanding before launch

1. Complete the privacy impact assessment (16.7), including Quebec Law 25
   implications where Quebec organizations or individuals are served.
2. Populate the subprocessor register and publish or make it available.
3. Confirm retention periods with counsel and an accountant.
4. Build the retention and deletion workers; the schedule is documented and the
   `retention_date` column exists, but nothing enforces it automatically yet.
5. Verify CASL-compliant consent and unsubscribe handling.
