# BotAssure CX

Bilingual AI customer-experience testing and assurance for Canadian businesses.

> **Working name.** "BotAssure CX" is a placeholder pending trademark,
> corporate-name and domain clearance. Every brand value is configurable via
> environment variables — see `.env.example`. Nothing in `src/` hard-codes the
> product name.

> **Build status.** This repository implements Phase 0 of the PRD plus the
> parts of Phases 1–4 that can be built and verified without vendor accounts.
> It is **not** ready to accept paying customers. Read
> [`PRD_TRACEABILITY.md`](PRD_TRACEABILITY.md) for the requirement-by-requirement
> status and the list of launch blockers.

## What is here

| Area | State |
|---|---|
| Bilingual public website (`en-CA` / `fr-CA`) | Complete, builds statically |
| Scoring, parity, entitlements, run state machine, findings workflow | Complete, 425 unit and service tests |
| Database schema with row-level security | Complete, verified against PostgreSQL 16 |
| Cross-tenant isolation suite | 27 assertions, all passing |
| Provider contracts (billing, email, AI, storage, queue, PDF, analytics, secrets) | Interfaces defined; no vendor adapters |
| Client portal, operations workspace, report generation | Not built |

## Requirements

- Node.js 22 or later
- PostgreSQL 16 client tools (for `npm run db:test`)
- A Supabase project, Stripe account, email provider and AI provider for the
  features that need them

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in what you have; the site runs without any of it
npm run dev                  # http://localhost:3000
```

The marketing site works with no configuration at all. Features that need a
vendor report `NOT_CONFIGURED` rather than failing silently or pretending to
succeed.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite |
| `npm run db:test` | Applies migrations to a throwaway PostgreSQL cluster and runs the RLS isolation suite |
| `npm run verify` | format check → lint → typecheck → test → build |

`npm run db:test` needs a non-root user (PostgreSQL's `initdb` refuses to run as
root). Set `PGBIN` if your PostgreSQL binaries are not at
`/usr/lib/postgresql/16/bin`. Pass `DATABASE_URL` to run against an existing
database instead of a temporary cluster.

## Database

```
supabase/
  migrations/
    20260808000100_initial_schema.sql     # section 12 data model
    20260808000200_row_level_security.sql # RLS policies + coverage assertion
  seed.sql                                # dev-only: packages, 24 scenarios, flags
  test/
    auth_stub.sql                         # stand-in for Supabase's auth schema
    rls_tenant_isolation.sql              # 27 cross-tenant assertions
```

Applying to a Supabase project:

```bash
supabase link --project-ref <ref>
supabase db push
# Seed DEVELOPMENT ONLY. Never run seed.sql against production (PRD 21.2).
psql "$DATABASE_URL" -f supabase/seed.sql
```

`auth_stub.sql` is for local and CI testing only — Supabase manages the real
`auth` schema, and applying the stub there would conflict with it.

The RLS migration ends with an assertion that fails if any table in `public`
lacks row-level security, so a new table cannot be added without a policy
decision.

## Architecture

Modular monolith with a separate worker boundary (PRD 14.1).

```
src/
  app/[locale]/      Public bilingual pages
  app/api/           Route handlers (contact, checkout, webhooks, health)
  components/        UI primitives and marketing components
  config/            Brand, packages, routes, legal register, feature flags
  domain/            Business rules — no vendor SDKs, no React
    scoring/         Dimensions, case/run scores, grades, caps, parity
    runs/            Run state machine and release gate
    findings/        Severity, review routing, remediation transitions
    entitlements/    Plan limits and usage checks
    checks/          Deterministic pre-evaluation checks
    billing/         Webhook idempotency decisions
  integrations/      Provider contracts and the registry that selects them
  lib/               i18n, security (SSRF, redaction), API helpers, env
supabase/            Migrations, seed, database tests
scripts/             db-test.sh
```

`domain/` depends on nothing but TypeScript and Zod. That is what makes the
scoring rules testable without a database and swappable vendors possible
(PRD 14.3, 5.3).

## Conventions worth knowing

**Translations are type-checked.** `src/lib/i18n/messages/fr-CA.ts` is typed as
`Messages`, derived from the English catalog. A missing French key is a compile
error, not a runtime fallback to English (FR-I18N-001).

**Prices are never sent by the client.** Checkout posts a package code; the
server resolves the billing provider's price ID. `src/config/packages.ts` holds
reference amounts for display only.

**Unconfigured providers fail closed.** `src/integrations/unconfigured.ts`
returns `NOT_CONFIGURED` for everything. There are deliberately no mock
implementations that return success — a fake "successful" checkout is exactly
the handoff-rejection condition in PRD section 28.

**Feature flags default off.** An unset flag is disabled, so a forgotten
environment value cannot enable a higher-risk capability in production.

**Logs are allowlisted, not blocklisted.** `safeLogPayload` keeps only known-safe
identifier fields and drops everything else, so a new field cannot leak by
default (PRD 19.4, 21.3).

## Documentation

| File | Contents |
|---|---|
| [`PRD_TRACEABILITY.md`](PRD_TRACEABILITY.md) | Every P0 requirement, its status and evidence |
| [`ASSUMPTIONS.md`](ASSUMPTIONS.md) | Decisions made where the PRD left a choice open |
| [`RUNBOOK.md`](RUNBOOK.md) | Non-technical operating procedures for the owner |
| [`SECURITY.md`](SECURITY.md) | Security controls and reporting |
| [`PRIVACY_DATA_MAP.md`](PRIVACY_DATA_MAP.md) | Data inventory, purposes, retention, subprocessors |
| [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md) | Incident and breach procedure |
| [`TEST_PLAN.md`](TEST_PLAN.md) | Test layers, what is covered, what is not |
| [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) | The PRD section 23 launch gate |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |

## Deployment

Not yet performed. When the vendor accounts exist:

1. Create separate vendor projects per environment (14.6). A preview deployment
   must never connect to the production database.
2. Set every variable from `.env.example` in the platform's secret manager.
   Never commit a filled `.env`.
3. `supabase db push` against the target project.
4. Configure the billing webhook endpoint at `/api/webhooks/billing` and record
   the signing secret.
5. Verify `/api/health/ready` returns 200. In production it fails while the
   database, billing or email is unconfigured, or while any legal document is
   still marked `LEGAL_REVIEW_REQUIRED`.
6. Work through `RELEASE_CHECKLIST.md`. Do not launch with unchecked P0 items.

## Licence

Proprietary. All rights reserved.
