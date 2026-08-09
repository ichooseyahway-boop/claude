# PRD Traceability Matrix

Maps every P0 requirement in the BotAssure CX PRD (v1.0, 8 August 2026) to its
implementation, tests and current status.

**This document is deliberately blunt about what is not built.** PRD section 1
says completion occurs "only when every P0 requirement and every launch gate in
this PRD has passed with evidence". That bar has **not** been met. This matrix
exists so the owner can see exactly where the gap is.

## Status vocabulary

| Status | Meaning |
|---|---|
| **Done** | Implemented and covered by an automated test that runs in this repo. |
| **Partial** | Core logic implemented and tested; an integration or UI surface is missing. |
| **Blocked** | Cannot be completed without a vendor account, credential or legal decision the owner must supply. |
| **Not started** | No implementation. |

## Summary

| Area | Done | Partial | Blocked | Not started |
|---|---:|---:|---:|---:|
| Marketing site | 5 | 0 | 0 | 0 |
| Auth and identity | 0 | 3 | 1 | 0 |
| Billing | 0 | 2 | 3 | 0 |
| Onboarding and authorization | 0 | 4 | 0 | 1 |
| AI systems and capture | 1 | 1 | 0 | 1 |
| Scenarios and plans | 0 | 3 | 0 | 1 |
| Execution | 3 | 1 | 0 | 1 |
| Evaluation | 3 | 1 | 0 | 1 |
| Findings | 4 | 0 | 0 | 0 |
| Reports | 3 | 0 | 1 | 1 |
| Client portal | 0 | 0 | 0 | 4 |
| Operations workspace | 0 | 0 | 0 | 5 |
| Notifications | 0 | 1 | 1 | 1 |
| Localization | 2 | 0 | 0 | 0 |
| Support and legal | 1 | 1 | 0 | 0 |

**22 of 51 P0 requirements are Done. The product still cannot accept a paying
customer**, and no part of the service layer below is reachable over HTTP yet —
there is no authentication and no operations or portal user interface. See
"What blocks launch" at the end.

---

## 9.1 Public marketing website

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-MKT-001 | Bilingual marketing pages | **Done** | `src/app/[locale]/**`, `src/lib/i18n/`, `src/lib/seo.ts` | `src/lib/i18n/i18n.test.ts` (key parity, placeholder parity, route preservation) |
| FR-MKT-002 | Homepage conversion structure | **Done** | `src/app/[locale]/page.tsx` | Build-verified; all required sections present in PRD order |
| FR-MKT-003 | Synthetic sample report | **Done** | `src/data/sample-report.ts`, `src/app/[locale]/sample-report/page.tsx` | Fictional customer, marked synthetic in three places |
| FR-MKT-004 | Lead and booking forms | **Done** | `src/components/marketing/contact-form.tsx`, `src/app/api/contact/route.ts`, `src/lib/validation/contact.ts` | `src/lib/api/rate-limit.test.ts`; client + server validation, honeypot, credential rejection |
| FR-MKT-005 | Honest proof system | **Done** | Catalogs contain no testimonials, logos or metrics | `i18n.test.ts` asserts prohibited claims (4.4) appear in neither locale |

**Note on FR-MKT-004:** the submission is validated, consent records are
constructed and the request is rate limited, but the lead is **not persisted**
and **no owner notification is sent** — both require the database and email
provider. The endpoint returns 202 and logs a safe line; it does not claim to
have emailed anyone.

## 9.2 Authentication, identity and organizations

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-AUTH-001 | Secure sign-in (magic link) | **Partial** | Request, callback and sign-out handlers implemented: rate limited per salted client key, identical response whether or not the address exists, post-sign-in redirect constrained to a path on this site, session read with `getUser()` (validated) rather than `getSession()` (cookie-trusting). 22 tests. Cannot be exercised end to end without a Supabase project. |
| FR-AUTH-002 | MFA (P0 internal) | **Partial** | `authorize()` refuses every internal role whose profile has no `mfaEnrolledAt`, tested in `access.test.ts`. Enrolment itself needs the auth provider. |
| FR-AUTH-003 | Organization membership | **Partial** | Schema, RLS and role model complete and tested. `buildActor` drops revoked, unaccepted, future-dated and other-user memberships before any authorization decision sees them. Invitation flow UI not built. |
| FR-AUTH-004 | Account recovery and removal | **Blocked** | Needs the auth provider. |

## 9.3 Purchase, entitlement and billing

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-BILL-001 | Hosted checkout | **Partial** | `src/app/api/checkout/session/route.ts` | Amount is never accepted from the client; price resolved server-side. Returns `BILLING_NOT_CONFIGURED` without a provider. |
| FR-BILL-002 | Verified idempotent webhooks | **Partial** | `src/domain/billing/webhook-processing.ts`, `src/app/api/webhooks/billing/route.ts` | `webhook-processing.test.ts` — replay rejection, out-of-order, dead-letter, failed-payment-grants-nothing (E2E scenarios 3 and 4). Persistence of `billing_events` still to wire. |
| FR-BILL-003 | Billing portal | **Blocked** | `BillingProvider.createPortalSession` contract defined; no adapter. |
| FR-BILL-004 | Entitlement engine | **Done** | `src/domain/entitlements/entitlements.ts`, `src/config/packages.ts` | `entitlements.test.ts` — 20 assertions incl. locale scope, retest window, overage, seat/system caps |
| FR-BILL-005 | Owner billing controls | **Blocked** | Needs provider + operations UI. |

## 9.4 Project onboarding and authorization

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-ONB-001 | Guided checklist | **Partial** | `onboardingChecklist` in `src/domain/services/onboarding.ts` computes the six steps, their completion and the first incomplete one; 28 service tests. No UI. |
| FR-ONB-002 | Testing authorization attestation | **Partial** | `acceptAuthorization` / `revokeAuthorization` require the Client Owner, freeze the scope, and are re-checked at `queued` and `running` and again at release. Tested end to end. Attestation UI not built. |
| FR-ONB-003 | Scope review | **Partial** | `submitForScopeReview` / `recordScopeDecision` in `onboarding.ts`, with declines requiring a reason. No UI. |
| FR-ONB-004 | Source policy intake | **Partial** | `addKnowledgeSource` records checksum, authority rank and scan status, and refuses an unscanned source. Upload/scan pipeline needs a storage vendor. |
| FR-ONB-005 | Credential handling | **Not started** | `connection_configs.secret_reference` with a CHECK constraint rejecting inline credentials; `SecretStore` contract defined; `maskSecret` implemented and tested. |

## 9.5–9.6 AI systems, capture and scenarios

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-SYS-001 | System record | **Done** | `ai_systems` table covers every field in the PRD list. |
| FR-SYS-002 | Capture modes | **Partial** | `capture_mode` enum covers all four; browser runner flag defaults off. No capture UI. |
| FR-SYS-003 | Connection test | **Not started** | SSRF guard ready; no endpoint. |
| FR-SCN-001 | Versioned scenario templates | **Partial** | `scenario_templates` with `(family_id, version, locale)` uniqueness; 24 seeded templates. Editing a published template creating a new version is enforced by convention, not yet by code. |
| FR-SCN-002 | Scenario categories | **Partial** | 12 matched bilingual pairs cover every category. **Appendix A requires ≥80 templates; 24 exist.** Remaining are analyst content. |
| FR-SCN-003 | Audit plan builder | **Partial** | `src/domain/services/planning.ts` — one draft at a time, entitlement cap enforced at build time, coverage and matched-pair gap reporting, senior approval, approved plans immutable, superseding requires a reason. 17 tests. No UI. |
| FR-SCN-004 | Synthetic test data | **Not started** | Seeded scenarios use synthetic identifiers (`TEST-100042`); no generator or blocked-format validator. |

## 9.7 Test execution and response capture

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-RUN-001 | Run state machine | **Done** | `src/domain/runs/state-machine.ts` | `state-machine.test.ts` — happy path, released immutability, role gating, reason requirements |
| FR-RUN-002 | Case execution capture | **Partial** | `createRun` / `captureResponse` in `src/domain/services/execution.ts` — SHA-256 checksums, refusal to overwrite a captured turn, capture errors routed to `unscorable`. 20 tests. Automated capture needs the HTTP client. |
| FR-RUN-003 | Safe API adapter | **Done** (guard) | `src/lib/security/ssrf.ts` | `ssrf.test.ts` — 24 assertions incl. metadata service, IPv4-mapped IPv6, redirects, credentials in URL (E2E scenario 8). The HTTP client that uses it is not built. |
| FR-RUN-004 | Pause and kill switch | **Done** | `canTransition` + `isExecutionKillSwitchEngaged` | Tested: execution blocked, review/report/release unaffected (E2E scenario 15) |
| FR-RUN-005 | Evidence integrity | **Done** | `conversation_turns_immutable` trigger; `contentChecksum` + overwrite refusal in `execution.ts` | `rls_tenant_isolation.sql` and `execution.test.ts` |

## 9.8 Evaluation and human review

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-EVAL-001 | Evaluation pipeline | **Done** | All six steps in `src/domain/services/evaluation.ts`: deterministic checks, policy rules, structured AI proposal, confidence checks, mandatory analyst review, approved scores. A case cannot reach `reviewed` without a human approving every dimension. 13 tests. |
| FR-EVAL-002 | Structured evaluator output | **Done** | `src/domain/evaluation/schema.ts` — versioned schema rejecting unknown dimensions, out-of-range and non-integer scores, duplicate dimensions and reversed spans; bounded retries then manual review. 19 tests, including prompt-injection defence. |
| FR-EVAL-003 | Human override | **Done** | `reviewEvaluation` requires every dimension, requires a reason to depart from the proposal, and keeps the proposed value alongside the approved one. |
| FR-EVAL-004 | Evaluator versioning | **Partial** | Rubric, prompt and schema versions are stamped on every evaluation and run. Re-running a historical case against a new evaluator version has no UI. |
| FR-EVAL-005 | Low-confidence routing | **Done** | `requiredReview` / `canReleaseFinding` in `src/domain/findings/findings.ts`, tested. |

Deterministic checks (10.9): **Done** — `src/domain/checks/deterministic.ts`,
17 tests covering all ten check types.

## 9.9 Findings and remediation

| ID | Requirement | Status | Tests |
|---|---|---|---|
| FR-FND-001 | Finding record | **Done** | `createFinding` refuses a finding with no evidence or a blank required field, assigns sequential references, and keeps `internalNotes` structurally out of anything report-bound. |
| FR-FND-002 | Severity levels | **Done** | `findings.test.ts` |
| FR-FND-003 | Critical alert control | **Done** | `planCriticalAlert` — internal alert never carries evidence; customer notice held until human confirmation (E2E scenario 10) |
| FR-FND-004 | Remediation workflow | **Done** | `canChangeFindingStatus` — all nine statuses, risk acceptance requires Client Owner + reason + review date, customers cannot self-mark resolved |

## 9.10 Reports

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-RPT-001 | Report composition | **Done** | `composeReport` reads approved scores and confirmed findings only, applies severity caps, orders by severity and returns a type that omits `internalNotes`. |
| FR-RPT-002 | Web and PDF | **Blocked** | `PdfRenderer` contract defined; no renderer. Print CSS is in `globals.css`. |
| FR-RPT-003 | Release control | **Done** | `previewReport` → `approveReport` → `releaseReport`, with `checkRelease` running all 9 blockers plus the secret and internal-note scanners. A blocked release writes a `denied` audit event (E2E scenario 11). No release UI. |
| FR-RPT-004 | Versioning and correction | **Done** | `correctReport` creates version 2 and marks the original `superseded`, never editing it; the release trigger backs this at the database level (E2E scenario 12) |

Scoring (10.2–10.7): **Done** — `src/domain/scoring/`, 40 tests covering
weights, N/A denominators, grade bands, severity caps, the 20% incompleteness
rule and the ten-pair parity threshold.

## 9.11–9.12 Client portal and operations

**Not started.** FR-PORT-001..003 and FR-OPS-001..005 have no implementation.
The schema, RLS policies and domain rules they depend on are in place and
tested, but no authenticated UI exists. This is the single largest remaining
body of work and it is what makes section 28's "the owner requires code edits
for routine orders" rejection criterion currently true.

## 9.13 Notifications

| ID | Status | Notes |
|---|---|---|
| FR-NOT-001 | **Blocked** | 14 template keys defined in `EmailTemplateKey`; no provider, no template bodies. |
| FR-NOT-002 | **Partial** | `EmailMessage.params` is documented as safe parameters only; `planCriticalAlert` enforces no-evidence-in-alerts and is tested. |
| FR-NOT-003 | **Not started** | `notifications` table stores a content KEY plus params, never rendered content. |

## 9.14 Localization

| ID | Status | Tests |
|---|---|---|
| FR-I18N-001 | **Done** | Catalogs typed against a shared contract; `i18n.test.ts` asserts zero missing/extra keys, no empty strings, no placeholder markers, consistent interpolation, and no English prose left in the French catalog. |
| FR-I18N-002 | **Partial** | French written for Canadian readers, not machine-translated. **Human fluent review is still outstanding and is a launch gate.** No glossary file yet. |

## 9.15 Support and legal

| ID | Status | Notes |
|---|---|---|
| FR-SUP-001 | **Not started** | `support_tickets` table exists with categories and RLS. |
| FR-LEGAL-001 | **Partial** | `consent_records` stores each consent type and version separately; contact form collects service and marketing consent as two independent records. |
| FR-LEGAL-002 | **Done** | `src/config/legal.ts` marks all five documents `LEGAL_REVIEW_REQUIRED`, the pages render a review banner, unapproved documents are `noindex`, and `/api/health/ready` fails in production while any document is unapproved. |

---

## Non-functional and governance

| Requirement | Status | Evidence |
|---|---|---|
| 16.1 security baseline | **Partial** | CSP and security headers in `next.config.ts`; RLS, redaction and SSRF guards done and tested. Malware scanning, dependency scanning in CI and backups not configured. |
| 16.2 tenant-isolation tests | **Done** | `supabase/test/rls_tenant_isolation.sql` — 27 assertions, all passing against PostgreSQL 16 |
| 16.5 retention defaults | **Partial** | Published on the security page and encoded in `evidence_objects.retention_date`; no retention worker. |
| 17.1 WCAG 2.2 AA | **Partial** | Skip link, focus styles, semantic landmarks, labelled fields, error summary linked to fields, reduced motion, scrollable tables with `role="region"`, no colour-only status. **No automated axe run and no manual screen-reader pass.** |
| 20.1 test layers | **Partial** | Unit and service (383 tests) and database/RLS (27 assertions) done. No integration, E2E, accessibility, visual regression or load tests. |
| 21.1 CI pipeline | **Not started** | `npm run verify` runs format, lint, typecheck, test and build locally. No CI workflow file. |
| 18.4 backups | **Blocked** | Requires a provisioned database. |

---

## What blocks launch

Ordered by what the owner must do first.

1. **Provision vendor accounts.** Supabase, Stripe, an email provider and an AI
   provider. Nothing in authentication, billing, onboarding, capture or
   reporting can be finished without them, and the PRD forbids substituting
   fake values.
2. **Build the authenticated surfaces.** Client portal (FR-PORT-001..003) and
   operations workspace (FR-OPS-001..005). The rules they enforce are already
   written and tested; what is missing is the UI and the persistence wiring.
3. **Commission legal review.** All five documents are drafts. Section 23.2 and
   FR-LEGAL-002 make this a hard gate, and `/api/health/ready` enforces it.
4. **Commission French review.** Copy is written for Canadian readers but has
   not been reviewed by a fluent human, which FR-I18N-002 requires.
5. **Expand the scenario library** from 24 to the ≥80 templates Appendix A
   specifies.
6. **Trademark, corporate-name and domain clearance** before the working name
   is used publicly.

Items in section 28's acceptance contract that cannot be produced from a
repository at all — a live production URL, a real test-mode purchase, a tested
database restore, owner training — are unmet by definition and are listed here
so they are not mistaken for oversights.
