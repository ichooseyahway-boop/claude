# Release checklist

The PRD §23 launch gate, scored honestly against the current repository.

**The gate does not pass.** This is recorded item by item rather than summarized, because PRD 1.1
rule 12 and PRD 28 both turn on knowing exactly which items are outstanding.

Legend: ☑ done · ☐ not done · ◐ partially done

## 23.1 Product and customer journey

- ◐ Public English and French sites are complete — home, pricing, methodology, security and legal
  routes exist in both locales; How It Works, Sample Report, About, Contact, FAQ and Status do not.
- ◐ Prices, taxes and package inclusions are accurate — inclusions match PRD 6.1–6.4 and render in
  both locales; tax behaviour is unconfigured because no payment account exists.
- ☐ Real test-mode purchase and refund flows pass — no billing adapter.
- ☐ New customer can activate an account and complete onboarding — no authentication.
- ◐ Authorization is required before execution — enforced by the state machine and the schema;
  no signing flow exists to produce an attestation.
- ☐ Analyst can complete and release an audit — no analyst workspace.
- ☐ Customer can view/download report and manage remediation — no portal.
- ☐ Subscription can renew, fail payment and cancel correctly — no billing adapter.
- ☐ Support path and expected response time are visible — schema only.

## 23.2 Trust and legal

- ☐ Product name/domain/trademark professionally cleared — working-name notice is displayed in the
  footer in both locales, as the PRD requires until this is done.
- ☐ Business registration and banking/payment setup complete.
- ☐ Terms reviewed by qualified Canadian counsel.
- ☐ Privacy policy and data-processing terms reviewed.
- ☐ Acceptable Use and authorization language reviewed.
- ☐ Refund policy reviewed for applicable consumer rules.
- ☐ Privacy impact assessment completed — `PRIVACY_DATA_MAP.md` is the input, not the assessment.
- ☐ Subprocessor list published — vendors not yet selected.
- ☐ CASL-compliant email consent and unsubscribe verified — `consent_records` separates consent
  types so marketing cannot be bundled into service acceptance; no email flow exists.
- ☑ No unsupported compliance or certification claims appear — enforced by a test scanning both
  message catalogues against PRD 4.4's prohibited territory.

## 23.3 Security and privacy

- ☐ Internal MFA enforced — column exists, no enrolment flow.
- ☑ RLS enabled and tested on all exposed tenant tables — asserted by migration and by 37 test
  assertions.
- ☑ Cross-tenant suite passes.
- ◐ Secrets scan passes — no production secret is in the repository and `.gitignore` excludes every
  `.env` variant, but no automated scanner runs.
- ☐ Critical dependency vulnerabilities resolved — no audit step configured.
- ◐ Upload and SSRF controls pass — SSRF guard complete and tested; upload controls are interface
  contracts with no implementation.
- ◐ Logs and analytics contain no transcripts or credentials — `redactForLog` and the typed
  analytics contract enforce this by construction; no end-to-end assertion.
- ☐ Retention and deletion jobs tested — columns exist, jobs do not.
- ☐ Backup restore tested.
- ◐ Incident response and breach register ready — `INCIDENT_RESPONSE.md` written; not rehearsed,
  not reviewed by counsel.
- ◐ Global execution kill switch tested — unit-tested in the state machine; no live execution to
  stop.

## 23.4 Quality and accessibility

- ☐ All P0 acceptance criteria mapped and passed — mapped in `PRD_TRACEABILITY.md`; many not passed.
- ☑ Production build, lint, types and automated tests pass — `npm run verify` is green.
- ☐ Evaluation fixture suite reviewed in both languages — not built (PRD 20.4 wants 60+ cases).
- ☑ No untranslated production strings — enforced at compile time and by test.
- ◐ WCAG 2.2 AA audit issues resolved — built to the PRD 17.1 checklist (skip link, focus,
  semantics, contrast, reduced motion, language-change marking, scrollable tables); no audit run.
- ☐ Mobile and supported-browser tests pass — no browser testing configured.
- ☐ PDFs readable, correctly branded, free of clipping — no PDF generation.
- ☐ Synthetic sample report clearly marked — no sample report.

## 23.5 Commercial operations

- ☐ Founder can operate order, onboarding, assignment, release, refund and deletion workflows
  without developer help — `RUNBOOK.md` documents the procedures; the interfaces they describe do
  not exist yet.
- ☐ Founder has practised a complete synthetic customer journey.
- ☐ Owner alerts route to monitored inboxes/devices.
- ◐ Service delivery checklist exists — `RUNBOOK.md`.
- ☐ Cost caps and provider budget alerts configured — ceilings are in `.env.example`; nothing reads
  them yet.
- ☐ First ten-customer capacity plan exists.
- ☐ No vendor account remains in test mode unintentionally — no vendor accounts exist.
- ☐ Status page and support email live.

## Score

3 of 47 items complete, 12 partial. The gate fails, as expected for a foundation.

## Pre-deploy commands

Once there is something to deploy:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run db:test
npm run build
```

PRD 21.1 additionally requires a secret scan and a dependency audit in CI. Neither is configured.
