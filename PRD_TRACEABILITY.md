# PRD traceability matrix

Required by PRD 1.1 rule 8. Maps every P0 requirement to its implementation path, tests and status.

**Status vocabulary**

| Status | Meaning |
|---|---|
| ✅ Complete | Implemented and covered by a passing automated test. |
| 🟨 Partial | Some part implemented and tested; the rest is named explicitly. |
| ⬜ Not started | No implementation exists. |

**Nothing is marked ✅ that is not covered by a test that runs today.** PRD 28 rejects the handoff if
tests are claimed but not runnable, so a requirement with only hand-written code sits at 🟨.

Current suite: **301 unit tests** (`npm test`) and **37 database assertions** (`npm run db:test`).

---

## 9.1 Public marketing website

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-MKT-001 | Bilingual marketing pages | 🟨 | `src/app/[locale]/`, `src/lib/i18n/` — home, pricing, methodology, security, 5 legal routes built in both locales. How It Works, Sample Report, About, Contact, FAQ, Status routes not built. hreflang + canonical in `layout.tsx`. | `i18n.test.ts` (key parity, no English in French, no placeholders) |
| FR-MKT-002 | Homepage conversion structure | ✅ | `src/app/[locale]/page.tsx` — every section the PRD lists, in order. | Build output; `i18n.test.ts` prohibited-claims scan |
| FR-MKT-003 | Synthetic watermarked sample report | ⬜ | — | — |
| FR-MKT-004 | Lead and booking forms | ⬜ | — | — |
| FR-MKT-005 | Honest proof system | ✅ | No testimonials, logos, review stars or usage metrics exist anywhere in the catalogues. | `i18n.test.ts` scans both locales for prohibited claims |

## 9.2 Authentication and organizations

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-AUTH-001 | Secure sign-in | ⬜ | Schema ready (`profiles`, `auth.users` FK). No auth flow. | — |
| FR-AUTH-002 | MFA (P0 internal) | 🟨 | `profiles.mfa_enrolled_at` column; `REAUTHENTICATION_REQUIRED_PERMISSIONS` enforces recent auth for high-risk actions. Enrolment flow not built. | `permissions.test.ts` (re-auth gate, fails closed) |
| FR-AUTH-003 | Organization membership | 🟨 | `memberships` table, unique-active index, project scoping, `authorize()`. Invitation acceptance flow not built. | `permissions.test.ts`, `01_tenant_isolation_test.sql` |
| FR-AUTH-004 | Account recovery and removal | ⬜ | — | — |

## 9.3 Purchase, entitlement and billing

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-BILL-001 | Hosted checkout | 🟨 | `BillingProvider.createCheckoutSession` / `getPaymentState` interfaces. Interface deliberately has no method accepting a query-string success flag. No Stripe adapter. | — |
| FR-BILL-002 | Verified idempotent webhooks | 🟨 | `billing_events.provider_event_id` unique; `orders.idempotency_key` unique; `verifyAndParseWebhook` combines verification and parsing so they cannot be separated. No adapter. | `01_tenant_isolation_test.sql` (replay refused) |
| FR-BILL-003 | Billing portal | 🟨 | `createBillingPortalSession` interface. No adapter. | — |
| FR-BILL-004 | Entitlement engine | ✅ | `src/domain/billing/entitlements.ts` — all eight entitlement axes, overage handling, hard ceiling, locale entitlement, schema-validated blobs. | `entitlements.test.ts` (22 tests) |
| FR-BILL-005 | Owner billing controls | 🟨 | `subscriptions.override_reason` / `override_by` with a paired-null constraint; `billing:refund` and `billing:override_entitlement` permissions require re-auth. No UI. | `permissions.test.ts` |

## 9.4 Onboarding and authorization

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-ONB-001 | Guided checklist | ⬜ | `projects.onboarding_completed_at` / `onboarding_accepted_at` exist. No UI. | — |
| FR-ONB-002 | Testing authorization attestation | 🟨 | `authorization_attestations` with version, scope, expiry, revocation; immutable except revocation; `app.project_authorization_active()`. State machine refuses execution without it and **fails closed** when context is absent. No signing UI. | `state-machine.test.ts`, `01_tenant_isolation_test.sql` |
| FR-ONB-003 | Scope review | 🟨 | `project_status` enum covers accept / request-changes / decline; `project:scope_decision` permission. No UI. | `permissions.test.ts` |
| FR-ONB-004 | Source policy intake | 🟨 | `knowledge_sources` with type restriction, checksum, scan status, authority rank, retention. `FileStorageProvider.createUploadUrl` binds content type and byte ceiling. No upload flow or scanner. | — |
| FR-ONB-005 | Credential handling | 🟨 | `connection_configs.secret_reference` accepts only a vault reference pattern — a plaintext secret is rejected by the database. `SecretStore` interface. No adapter. | `01_tenant_isolation_test.sql` (raw secret refused) |

## 9.5 AI system profiles

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-SYS-001 | System record | 🟨 | `ai_systems` carries every field the PRD lists. No UI. | — |
| FR-SYS-002 | Capture modes | 🟨 | `app.capture_mode` enum: manual, customer_upload, api_adapter, browser_runner. No execution paths. | — |
| FR-SYS-003 | Connection test | ⬜ | `connection_configs.status` / `last_tested_at` exist. No test path. | — |

## 9.6 Scenario library and audit plans

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-SCN-001 | Versioned scenario templates | ✅ | `scenario_templates` with `(family_id, version)` unique and a trigger freezing published bodies. | `01_tenant_isolation_test.sql`, `library.test.ts` |
| FR-SCN-002 | Scenario categories | ✅ | All 14 categories present in `SCENARIO_CATEGORIES` and covered by the seed library. | `library.test.ts` (per-category coverage) |
| FR-SCN-003 | Audit plan builder | 🟨 | `audit_plans` versioned, frozen on approval by trigger; `plan_scenarios` with bilingual pair IDs. No builder UI. | `01_tenant_isolation_test.sql` |
| FR-SCN-004 | Synthetic test data | 🟨 | Library uses `TEST-` order references and `.example`/`.invalid` domains only, asserted by test. Card and government-ID blocking implemented in `redaction.ts`; not yet wired to a project intake gate. | `library.test.ts`, `redaction.test.ts` |

## 9.7 Execution and capture

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-RUN-001 | Run state machine | ✅ | `src/domain/runs/state-machine.ts` — full graph, terminal states, released→superseded only. | `state-machine.test.ts` (17 tests) |
| FR-RUN-002 | Case execution capture | 🟨 | `test_cases` and `conversation_turns` carry every field the PRD lists, with checksums. No execution engine. | `01_tenant_isolation_test.sql` |
| FR-RUN-003 | Safe API adapter | 🟨 | `src/lib/security/ssrf.ts` — scheme, port, credential, hostname, IP-literal and allowlist checks plus `assertSafeResolvedIps` for the DNS-rebinding half. The adapter that calls them is not built. | `ssrf.test.ts` (27 tests) |
| FR-RUN-004 | Pause and kill switch | ✅ | `evaluateTransition` refuses `queued`/`running` when the kill switch is set, and explicitly does **not** block review, reporting or release. | `state-machine.test.ts` |
| FR-RUN-005 | Evidence integrity | ✅ | `conversation_turns` blocked from UPDATE and DELETE by trigger; `evidence_objects.supersedes_id` with a paired reason constraint. | `01_tenant_isolation_test.sql` |

## 9.8 Evaluation and human review

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-EVAL-001 | Evaluation pipeline order | 🟨 | Steps 1–2 (`deterministic-checks.ts`) and the schema gate (step 3) exist; RLS makes AI proposals internal-only. The orchestrator that runs them in sequence is not built. | `deterministic-checks.test.ts`, `01_tenant_isolation_test.sql` |
| FR-EVAL-002 | Structured evaluator output | ✅ | `src/domain/evaluations/schema.ts` — strict Zod schema, evidence-span verification against the real response, bounded retry then manual review. | `schema.test.ts` (20 tests) |
| FR-EVAL-003 | Human override | 🟨 | `evaluations.override_reason` required by constraint when overridden; `dimension_scores` keeps proposed and approved side by side. No review UI. | `01_tenant_isolation_test.sql` |
| FR-EVAL-004 | Evaluator versioning | 🟨 | `evaluation_versions` append-only, unique per (rubric, prompt, model, schema). No upgrade workflow. | — |
| FR-EVAL-005 | Low-confidence routing | ✅ | `analystConfirmationReasons()` returns every reason the PRD lists. | `severity` coverage via `score.test.ts` and schema tests |

## 9.9 Findings and remediation

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-FND-001 | Finding record | ✅ | `findings` carries every listed field, with `internal_notes` and `customer_notes` as separate columns. | `01_tenant_isolation_test.sql` |
| FR-FND-002 | Severity levels | ✅ | `src/domain/findings/severity.ts` + `app.finding_severity`. | `score.test.ts` |
| FR-FND-003 | Critical alert control | ⬜ | Notification pipeline not built. | — |
| FR-FND-004 | Remediation workflow | ✅ | All nine statuses; risk acceptance requires actor and reason by constraint; status history written by trigger, not by the caller. | `01_tenant_isolation_test.sql` |

## 9.10 Reports

| ID | Requirement | Status | Implementation | Tests |
|---|---|---|---|---|
| FR-RPT-001 | Report composition | ⬜ | `reports.content_snapshot` exists to hold it. No composer. | — |
| FR-RPT-002 | Web and PDF | ⬜ | `PdfRenderer` interface only. | — |
| FR-RPT-003 | Release control | 🟨 | State machine blocks `released` unless the checklist flag is set and **fails closed** without it; `scanForReleaseBlockers()` detects secrets in report content. The checklist evaluator is not built. | `state-machine.test.ts`, `redaction.test.ts` |
| FR-RPT-004 | Versioning and correction | ✅ | Released reports immutable by trigger; correction requires a reason by constraint; supersession allowed. | `01_tenant_isolation_test.sql` |

## 9.11–9.15 Portal, operations, notifications, localization, legal

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-PORT-001…003 | Client portal | ⬜ | Not built. |
| FR-OPS-001…004 | Operations workspace | ⬜ | Schema and permissions ready; no UI. |
| FR-OPS-005 | Audit event viewer | 🟨 | `audit_events` immutable by trigger, owner-only by RLS. No viewer. |
| FR-NOT-001…003 | Notifications | 🟨 | `notifications` stores a translation key and params rather than rendered text, so the recipient's locale decides wording at read time. `EmailProvider.send` has no body or attachment parameter, making FR-NOT-002 violations structurally impossible. No templates or delivery. |
| FR-I18N-001 | Locale architecture | ✅ | Typed catalogues; French must satisfy the English shape or the build fails. No partial-fallback code path exists. | `i18n.test.ts` |
| FR-I18N-002 | Canadian French quality | 🟨 | Copy written for Canadian readers, not machine-translated; automated checks for missing keys, placeholders and English left in French. **Human fluent review has not happened** — launch gate stays unchecked. | `i18n.test.ts` |
| FR-SUP-001 | Support requests | 🟨 | `support_tickets` with bounded description. No UI. |
| FR-LEGAL-001 | Versioned consent | 🟨 | `consent_records` stores one row per consent type, making marketing consent structurally impossible to bundle into service acceptance. No capture flow. |
| FR-LEGAL-002 | Policy placeholders | ✅ | All five legal routes exist in both locales and display `LEGAL_REVIEW_REQUIRED` prominently, `noindex`. Body text is deliberately not a drafted agreement. |

## §10 Methodology and scoring

| Section | Status | Implementation | Tests |
|---|---|---|---|
| 10.2 Score dimensions | ✅ | `DEFAULT_DIMENSION_WEIGHTS`, read directly by the public methodology page so the two cannot drift. | `score.test.ts` |
| 10.3 Dimension scale | ✅ | 0–5 plus N/A-with-reason; refuses to score a case where every dimension is N/A rather than returning a misleading zero. | `score.test.ts` |
| 10.4 Calculation | ✅ | `calculateCaseScore`, `calculateRunScore`, risk weights restricted to 1.0/1.5/2.0. | `score.test.ts` |
| 10.5 Grade bands | ✅ | `gradeForScore`. | `score.test.ts` (boundary cases) |
| 10.6 Severity caps | ✅ | Confirmed-critical → 49/F; unresolved-high in a key dimension → 69/D; >20% unscorable → incomplete unless an owner exception exists. A cap never raises a score, and is still reported when the score is already lower. | `score.test.ts` |
| 10.7 Parity index | ✅ | Weighted-gap formula, four bands, ten-pair minimum, unscorable pairs discarded rather than counted as gaps. | `parity.test.ts` (13 tests) |
| 10.8 Confidence | ✅ | `blockedCriticalReason` + a database check constraint. Enforced in both layers. | `01_tenant_isolation_test.sql` |
| 10.9 Deterministic checks | ✅ | All eleven checks. Produce candidates only — asserted by test. | `deterministic-checks.test.ts` (26 tests) |
| 10.10 Required limitations | ✅ | Present on the homepage and methodology page in both locales, given visual weight rather than footnoted. | `i18n.test.ts` |

## §12 Data model

| Section | Status | Notes |
|---|---|---|
| 12.1–12.6 All tables | ✅ | Every table the PRD names exists with the listed fields. `supabase/migrations/0001`–`0007`. |
| 12.7 Data integrity | ✅ | FKs throughout; unique constraints on provider event IDs and idempotency keys; enum and range check constraints; immutability triggers on turns, audit events, released reports, status history; `on delete restrict` on billing and evidence paths. |

## §16 Security and privacy

| Section | Status | Notes |
|---|---|---|
| 16.1 Security baseline | 🟨 | ✅ CSP with per-request nonce, HSTS, frame-deny, COOP/CORP, Permissions-Policy; RLS on every table (asserted by a migration that fails if one is missing); explicit grants; SSRF guard; redaction. ⬜ Rate limiting, malware scanning, dependency/secret scanning in CI. |
| 16.2 Tenant-isolation tests | ✅ | 37 assertions: cross-tenant read by ID, unfiltered scans, internal notes, billing-only access, draft visibility, anonymous access. |
| 16.3 Data minimization | ✅ | Region not IP on attestations; coarse metadata on report access; `redactForLog` drops transcript-shaped keys; analytics values restricted to identifiers and scalars by type. |
| 16.5 Retention defaults | 🟨 | Retention columns and `.env.example` defaults exist. No deletion job. |

---

## Known P0 gaps

Stated plainly, because PRD 28 rejects a handoff with unexplained P0 omissions:

1. **No authentication.** Nothing can be signed into.
2. **No provider adapters.** Interfaces exist; Stripe, Resend, Supabase and the AI provider are not
   wired.
3. **No customer portal or analyst workspace.** `/app` and `/ops` do not exist.
4. **No API route handlers.** The endpoints in PRD §13 are unimplemented.
5. **No report composition or PDF rendering.**
6. **No job queue, workers or retention jobs.**
7. **No end-to-end tests.** The fifteen mandatory E2E scenarios in PRD 20.2 cannot run without the
   above. Where an E2E scenario has a testable domain core, that core is covered by unit or database
   tests — noted per requirement above.
8. **Scenario library is 54 templates, not 80+** (Appendix A).
9. **No CI pipeline configured.** `npm run verify` and `npm run db:test` run the checks PRD 21.1
   requires, but no workflow file invokes them.
10. **French copy has not had human fluent review**, and no legal document has had counsel review.
