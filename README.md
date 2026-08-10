# BotAssure CX

Bilingual (en-CA / fr-CA) AI customer-experience testing and assurance platform for Canadian small
and midsize businesses.

> **Working name.** "BotAssure CX" requires professional trademark, domain and corporate-name
> clearance before public launch. The name appears in configuration and message catalogues so it can
> be changed without touching business logic.

---

## Status: foundation complete, product incomplete

**Read this before anything else.** This repository does not contain a finished commercial product.
The PRD it is built from is a full launch contract spanning seven build phases; what exists here is
Phase 0 plus the parts of Phases 1–4 that are pure, testable domain logic, schema and public
surface.

**What is built and verified**

| Area | State |
|---|---|
| Scoring engine (PRD 10.4–10.7) | Complete, 42 unit tests |
| Bilingual parity index (PRD 10.7) | Complete, 13 unit tests |
| Run state machine (FR-RUN-001, 004) | Complete, 17 unit tests |
| Entitlement engine (FR-BILL-004) | Complete, 22 unit tests |
| Permission matrix (PRD §7) | Complete, 24 unit tests |
| Evaluator output schema (FR-EVAL-002) | Complete, 20 unit tests |
| Deterministic checks (PRD 10.9) | Complete, 26 unit tests |
| SSRF guard (FR-RUN-003) | Complete, 27 unit tests |
| Redaction / release scanner (FR-RPT-003) | Complete, 24 unit tests |
| Prompt-injection defence (PRD 15.3, 15.5) | Complete, 10 unit tests |
| Severity + confirmation rules (10.8, FR-EVAL-005) | Complete, 16 unit tests |
| Database schema + RLS (PRD §12) | Complete, 37 assertions against real PostgreSQL |
| Bilingual marketing site | Home, pricing, methodology, security, legal routes |
| i18n layer (FR-I18N-001) | Complete, 20 tests including a missing-key gate |
| Provider interfaces (PRD 14.3) | Interfaces defined; adapters not implemented |
| Scenario library (Appendix A) | 27 families × 2 locales = 54 templates (PRD asks for 80+) |

**What is not built**

Authentication and session handling; Stripe / Resend / Supabase adapter implementations; the
customer portal (`/app`); the analyst workspace (`/ops`); API route handlers; the job queue and
workers; PDF report rendering; email templates; end-to-end tests; observability wiring.

`PRD_TRACEABILITY.md` maps every P0 requirement to its status. Nothing there is marked complete
that is not actually complete and covered by a test.

---

## Requirements

- Node.js 22 or later
- PostgreSQL 16 (for `npm run db:test` only; production uses Supabase)
- A Supabase project, a Stripe account and an email provider, for anything beyond local domain work

## Local setup

```bash
npm install
cp .env.example .env.local     # fill in development values only
npm run dev                    # http://localhost:3000 → redirects to /en-CA
```

`.env.example` documents names and descriptions only and never contains a real secret. Local
development must use synthetic data (PRD 14.6).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier |
| `npm test` | Vitest unit suite |
| `npm run test:coverage` | Coverage with thresholds on the domain core |
| `npm run db:test` | Applies all migrations to a throwaway database and runs the RLS suite |
| `npm run verify` | Everything above except `db:test`, in CI order |

### Running the database tests

`db:test` needs a reachable PostgreSQL. Against a local cluster:

```bash
PGPORT=5432 npm run db:test
```

It creates `botassure_dbtest`, applies `supabase/test/00_supabase_shim.sql` (a minimal stand-in for
Supabase's `auth` schema and PostgREST roles), applies every migration in order, then runs
`supabase/test/01_tenant_isolation_test.sql`. Any failed assertion exits non-zero.

The shim is **local-only**. It is never applied to a Supabase project, where the real objects exist.

## Repository layout

```
src/
  app/[locale]/         Bilingual public routes
  components/marketing/ Header, footer, language switcher
  domain/               Pure business logic — no I/O, no vendor SDKs
    authz/              Permission matrix (PRD §7)
    billing/            Entitlements and package catalogue (PRD §6)
    evaluations/        Evaluator schema and deterministic checks (PRD 10.9, 15.4)
    findings/           Severity and confirmation rules (FR-FND-002)
    runs/               Run state machine (FR-RUN-001)
    scenarios/          Seed scenario library (Appendix A)
    scoring/            Score, grade, caps, parity (PRD §10)
  integrations/         Provider interfaces and adapters (PRD 14.3)
  lib/
    i18n/               Locale config, catalogues, formatting
    security/           Headers, SSRF guard, redaction
  proxy.ts              Locale routing and per-request CSP nonce (Next 16 convention)
supabase/
  migrations/           Schema, RLS policies and grants
  test/                 Local shim and the tenant-isolation suite
scripts/db-test.sh
```

The rule that keeps this maintainable (PRD 18.5): **`src/domain` imports no vendor SDK and performs
no I/O.** Every decision the product makes — what a score is, who may release a report, whether a
run may start — is a pure function that can be tested without a network.

## Architecture notes

- **Modular monolith** with a worker boundary (PRD 14.1), not microservices.
- **Two authorization layers, both required.** `src/domain/authz/permissions.ts` answers
  "may this actor take this action" (including re-authentication rules RLS cannot express); Row
  Level Security answers "which rows exist for this connection". Neither is sufficient alone.
- **Grants are explicit.** `0007_grants.sql` revokes the permissive defaults and grants table by
  table, so a new table is unreachable until someone decides who may read it.
- **Untrusted content is never concatenated into a system prompt.** See
  `src/integrations/ai/prompt.ts`; the test suite asserts the system prompt is byte-identical
  regardless of what the tested system returned.

## Documents

| File | Contents |
|---|---|
| `PRD_TRACEABILITY.md` | Every P0 requirement → implementation path, tests, status |
| `ASSUMPTIONS.md` | Decisions not settled by the PRD, and why they went the way they did |
| `RUNBOOK.md` | Non-technical owner operating procedures |
| `SECURITY.md` | Security posture, controls and reporting |
| `PRIVACY_DATA_MAP.md` | Data inventory, purposes, retention |
| `INCIDENT_RESPONSE.md` | Incident and breach procedure |
| `TEST_PLAN.md` | Test layers, what is covered, what is not |
| `RELEASE_CHECKLIST.md` | The PRD §23 launch gate, honestly scored |
| `CHANGELOG.md` | Change history |

## Licence

Proprietary. All rights reserved.
