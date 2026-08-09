# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Initial implementation against the BotAssure CX PRD v1.0 (8 August 2026).
Not yet released, and not yet able to accept paying customers — see
`PRD_TRACEABILITY.md`.

### Added

**Foundation**
- Next.js 16 App Router scaffold with TypeScript strict mode, Tailwind CSS v4,
  ESLint, Prettier and Vitest, all dependency versions pinned.
- Content-Security-Policy and security response headers; `noindex` and
  `no-store` on authenticated route prefixes.
- Environment configuration with per-integration "is configured" checks that
  fail one feature rather than the whole application.
- Feature flags that default to off, plus a global execution kill switch.

**Bilingual site**
- `en-CA` and `fr-CA` message catalogs, with the French catalog typed against
  the English one so a missing key is a compile error.
- All public routes from PRD 11.1 in both locales, with `hreflang`, canonical
  URLs and language switching that preserves the equivalent route.
- Homepage built to the FR-MKT-002 conversion structure.
- Methodology page generated from the same rubric the scoring engine uses.
- Synthetic sample report for a fictional customer, marked as synthetic.
- Legal document register that marks all five templates `LEGAL_REVIEW_REQUIRED`,
  renders a review banner and blocks search indexing until approved.

**Domain engine**
- Scoring: dimension weights, case and run scores, grade bands, severity caps
  and the 20% incompleteness rule.
- Bilingual parity index with the ten-matched-pair publication threshold.
- Run state machine, release gate and kill-switch interaction.
- Findings: severity, review routing, publishable severity, critical alert
  planning and remediation status transitions.
- Entitlement engine and package catalogue.
- Deterministic pre-evaluation checks.
- Billing webhook idempotency, ordering and dead-letter decisions.

**Service layer**
- Repository interfaces where every tenant-scoped method takes an explicit
  `organizationId`, plus an in-memory store so the services are testable without
  a database.
- Permission model, actor resolution and a `permit()` helper that binds the
  request clock into every authorization decision.
- Onboarding: system profile, knowledge sources, scope review and the
  authorization attestation that gates all testing.
- Planning: one draft plan at a time, entitlement caps enforced at build time,
  coverage and matched-pair gaps, senior approval, immutability after approval.
- Execution: run creation from an approved plan, state transitions re-checked
  against authorization and the kill switch, checksummed immutable capture.
- Evaluation: deterministic checks, structured-output AI proposal with bounded
  retries, and mandatory analyst review of every dimension before any score is
  approved.
- Findings and reports: evidence-linked findings, severity confirmation routing,
  risk acceptance recorded with accepter, reason and review date, report
  composition from approved data only, preview, approval, the nine-condition
  release gate, and corrections as new versions.

**AI evaluator**
- Constant system prompt with untrusted captured content confined to delimited
  blocks, delimiter neutralization and a bounded input budget.
- Versioned output schema rejecting unknown dimensions, out-of-range or
  non-integer scores, duplicate dimensions and reversed evidence spans.
- Anthropic adapter behind the `AIProvider` contract, reporting itself
  unconfigured without credentials so no other environment changes.

**Security**
- SSRF guard for outbound capture, including redirect re-validation.
- Allowlist-based safe logging, key- and value-based redaction, secret masking
  and a release-time secret scanner.
- Rate limiting for public forms and sign-in requests, keyed by a salted hash
  rather than a stored IP address.

**Database**
- Full PRD section 12 schema with enums, check constraints and foreign keys.
- Row-level security on every table, with a migration-time assertion that fails
  if any table lacks it.
- Immutability triggers for captured content, released reports and audit events.
- Seed data: four packages, 12 matched bilingual scenario pairs, feature flags
  defaulted off, guarded against running in production.
- 27-assertion cross-tenant isolation suite and `scripts/db-test.sh`.

**Integrations**
- Provider contracts for billing, email, AI, storage, queue, PDF, analytics and
  secrets, with a registry that selects implementations.
- Unconfigured implementations that fail closed. No mocks that return success.

**API**
- Contact/lead endpoint with client and server validation, honeypot, credential
  rejection and separate service/marketing consent records.
- Checkout session endpoint that never accepts an amount from the client.
- Billing webhook receiver that verifies signatures against the raw body.
- Liveness and readiness probes; readiness fails in production while legal
  documents are unapproved.

**Documentation**
- `README.md`, `PRD_TRACEABILITY.md`, `ASSUMPTIONS.md`, `RUNBOOK.md`,
  `SECURITY.md`, `PRIVACY_DATA_MAP.md`, `INCIDENT_RESPONSE.md`, `TEST_PLAN.md`,
  `RELEASE_CHECKLIST.md`, `.env.example`.

### Not included

Authentication and session handling, the operations workspace and client portal
user interfaces, PDF rendering, scheduled monitoring, retention workers, the CI
workflow and the evaluation fixture suite. The service layer above is complete
and tested but has no HTTP surface in front of it yet.

Vendor accounts for database, billing, email and AI are not provisioned, and
PRD 1.1.12 forbids substituting placeholder production values.

### Verification

343 unit tests pass across 18 files. 27 database isolation assertions pass
against PostgreSQL 16. `npm run verify` (format, lint, typecheck, test, build)
is clean, with all bilingual routes prerendered.
