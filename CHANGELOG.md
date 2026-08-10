# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses semantic versioning once
it reaches 1.0.

## [Unreleased]

### Added

**Foundation (PRD Phase 0)**
- Next.js 16 App Router project, TypeScript strict mode with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`, ESLint, Prettier, Vitest.
- `.env.example` documenting every configuration name with no secret values.

**Domain core (pure, no I/O)**
- Scoring engine: case and run scores, grade bands, severity caps, unscorable-completeness rule
  (PRD 10.2–10.6).
- Bilingual parity index with the ten-pair minimum (PRD 10.7).
- Run state machine with kill switch, authorization and release gates, all failing closed
  (FR-RUN-001, FR-RUN-004).
- Entitlement engine with overage handling and hard ceilings (FR-BILL-004).
- Permission matrix with project scoping and re-authentication requirements (PRD §7).
- Evaluator output schema with evidence-span verification and bounded retry (FR-EVAL-002).
- Eleven deterministic checks producing candidates only (PRD 10.9).
- Seed scenario library: 27 families across all 14 Appendix A categories, emitted as matched
  en-CA / fr-CA pairs.

**Security**
- SSRF guard covering scheme, port, credentials, IP literals, internal hostnames and allowlists,
  plus a resolved-address check for DNS rebinding (FR-RUN-003).
- Redaction and the report release scanner (FR-RPT-003, PRD 19.4, 21.3).
- Security response headers with a per-request CSP nonce (PRD 16.1).
- Prompt-injection defence: untrusted content never reaches the system instruction (PRD 15.3, 15.5).

**Database**
- Seven migrations covering the full PRD §12 data model.
- Row Level Security on every table, with a migration-time assertion that fails if one is missing.
- Explicit grants replacing Supabase's permissive defaults.
- Immutability triggers on conversation turns, audit events, released reports, status history and
  attestations.
- Local Supabase shim and a 37-assertion tenant-isolation suite runnable against plain PostgreSQL.

**Bilingual surface**
- Typed en-CA / fr-CA message catalogues where a missing French key is a compile error.
- Locale middleware with negotiation, cookie persistence and route-preserving switching.
- Marketing pages: home, pricing, methodology, security, and five legal routes carrying the
  `LEGAL_REVIEW_REQUIRED` status (FR-LEGAL-002).

**Provider abstractions**
- Interfaces for billing, email, AI, storage, queue, PDF, analytics and secrets (PRD 14.3).

### Fixed during development

- `app.can_access_project()` granted billing administrators project access through ordinary
  organization membership, contradicting PRD 7.6. Caught by the database test suite.
- Payment-card detection consumed the separator following the last digit, redacting adjacent
  whitespace.
- Canadian SIN validation inherited the 13–19 digit card-length constraint and rejected every valid
  nine-digit SIN.

### Not yet implemented

Authentication, provider adapters, customer portal, analyst workspace, API routes, report
composition and PDF rendering, job queue and workers, retention jobs, email templates, end-to-end
tests, CI pipeline. See `PRD_TRACEABILITY.md` for the requirement-level breakdown.
