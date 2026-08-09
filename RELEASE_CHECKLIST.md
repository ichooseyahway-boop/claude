# Release Checklist

The PRD section 23 launch gate, plus the per-report release checklist from
Appendix C.

**Current state: the launch gate is not met.** Boxes below reflect what is
actually true today. Nothing is ticked optimistically.

---

## 23.1 Product and customer journey

- [ ] Public English and French sites are complete
      — *Pages are built and bilingual; French still needs fluent human review.*
- [ ] Prices, taxes and package inclusions are accurate
      — *Reference prices match the PRD; no billing provider price records exist.*
- [ ] Real test-mode purchase and refund flows pass
- [ ] New customer can activate an account and complete onboarding
- [x] Authorization is required before execution
      — *Enforced by the release gate; attestation UI not built.*
- [ ] Analyst can complete and release an audit
- [ ] Customer can view/download report and manage remediation
- [ ] Subscription can renew, fail payment and cancel correctly
      — *Decision logic implemented and tested; not wired to a provider.*
- [x] Support path and expected response time are visible
      — *Contact page states one business day and explicitly does not promise 24/7.*

## 23.2 Trust and legal

- [ ] Product name, domain and trademark professionally cleared
      — *Working name. Footer carries the notice until `BRAND_NAME_CLEARANCE_COMPLETED=true`.*
- [ ] Business registration and banking/payment setup complete
- [ ] Terms reviewed by qualified Canadian counsel
- [ ] Privacy policy and data-processing terms reviewed
- [ ] Acceptable Use and authorization language reviewed
- [ ] Refund policy reviewed for applicable consumer rules
- [ ] Privacy impact assessment completed
- [ ] Subprocessor list published or available
- [ ] CASL-compliant email consent and unsubscribe handling verified
      — *Consent is captured and versioned separately; no email provider yet.*
- [x] No unsupported compliance or certification claims appear
      — *Asserted by an automated test over both message catalogs.*

**All five legal documents are marked `LEGAL_REVIEW_REQUIRED`.**
`/api/health/ready` returns 503 in production while that is true, so this gate
is enforced, not merely documented.

## 23.3 Security and privacy

- [ ] Internal MFA enforced — *blocked on the auth provider*
- [x] RLS enabled and tested on all exposed tenant tables
      — *Migration asserts coverage; 27 isolation assertions pass*
- [x] Cross-tenant suite passes
- [ ] Secrets scan passes — *no CI; no secrets are committed, but nothing enforces it*
- [ ] Critical dependency vulnerabilities resolved — *no automated audit in CI*
- [ ] Upload and SSRF controls pass
      — *SSRF guard implemented and tested; upload controls not built*
- [x] Logs and analytics contain no transcripts or credentials
      — *Allowlist-based logging, tested*
- [ ] Retention and deletion jobs tested — *not built*
- [ ] Backup restore tested — *no database provisioned*
- [ ] Incident response and breach register ready
      — *Procedure documented; contact names and register not yet populated*
- [x] Global execution kill switch tested

## 23.4 Quality and accessibility

- [ ] All P0 acceptance criteria mapped and passed
      — *Mapped in PRD_TRACEABILITY.md; 14 of 51 done*
- [x] Production build, lint, types and automated tests pass
- [ ] Evaluation fixture suite reviewed in both languages — *not built*
- [x] No untranslated production strings — *enforced by type checking and tests*
- [ ] WCAG 2.2 AA audit issues resolved or documented
      — *Built to AA patterns; no automated axe run, no screen-reader pass*
- [ ] Mobile and supported-browser tests pass — *not run*
- [ ] PDFs readable, branded and free of clipping — *no PDF renderer*
- [x] Synthetic sample report clearly marked

## 23.5 Commercial operations

- [ ] Founder can operate order, onboarding, assignment, release, refund and
      deletion workflows without developer help
      — **Currently false.** No operations workspace. This is section 28's
      explicit rejection condition.
- [ ] Founder has practised a complete synthetic customer journey
- [ ] Owner alerts route to monitored inboxes or devices
- [x] Service delivery checklist exists — *RUNBOOK.md*
- [ ] Cost caps and provider budget alerts configured
- [ ] First ten-customer capacity plan exists
- [ ] No vendor account unintentionally in test mode
- [ ] Status page and support email live
      — *Status page exists but reports "unknown"; no uptime source connected*

---

## Per-report release checklist (Appendix C)

Run this for **every** report before release. The system enforces the starred
items and will block release without them.

- [ ] Customer, project, system and dates are correct
- [ ] ★ Authorization was active for all tests
- [ ] ★ Scope and exclusions are explicit
- [ ] Source policies and versions are listed
- [ ] ★ All required scenarios completed, or exceptions explained
- [ ] Score calculation and any applied cap verified
- [ ] ★ Critical and high findings have human approval
- [ ] Evidence opens for an authorized reviewer
- [ ] ★ No credential, restricted personal data or internal note is visible
- [ ] French terminology has been reviewed
- [ ] Bilingual parity has ten or more matched pairs, or is labelled qualitative
- [ ] Remediation is specific and testable
- [ ] Limitations and non-certification disclaimer included
- [ ] ★ PDF preview checked page by page
- [ ] ★ Release version and reviewer recorded

★ = enforced by `evaluateReleaseGate` in `src/domain/runs/state-machine.ts`.
If the gate blocks a release, fix the condition. Never work around it.

---

## Pre-deployment sequence

1. `npm run verify` — format, lint, typecheck, tests, production build.
2. `npm run db:test` — migrations and RLS isolation suite.
3. Confirm no secret is committed; confirm `.env` files are gitignored.
4. Review the dependency audit against the documented threshold.
5. Apply migrations to the target environment. Confirm a recovery point exists
   before any destructive migration.
6. Deploy.
7. Confirm `/api/health/ready` returns 200.
8. Confirm security headers on a live response.
9. Smoke-test both locales and the language switcher.
10. Confirm the billing webhook endpoint receives and verifies a test event.

## Rollback

1. Redeploy the previous build.
2. Database migrations are forward-only by default. If a migration must be
   undone, use the documented reverse steps for that migration; never drop a
   table containing evidence or billing records without an explicit retention
   decision.
3. If the incident involves data exposure, follow INCIDENT_RESPONSE.md instead
   of rolling back first — preserve evidence before restoring service.
