# School Inbox

**Human-verified school administration for families.** Forward the school
emails, newsletters, screenshots, schedules, and flyers — School Inbox turns
them into a verified family calendar, prioritized action list, and reminder
plan, so nothing important quietly disappears.

This repository implements **Release 0 — the revenue-ready Concierge MVP**
described in [`docs/SCHOOL_INBOX_PRD.md`](docs/SCHOOL_INBOX_PRD.md). It is a
premium marketing site, working Stripe test-mode checkout, a verified and
idempotent webhook, a secure multi-step onboarding flow, transactional email
behind a provider adapter, and a minimal protected operations console.

> **Scope.** Release 0 only. No inbound-email automation, AI extraction, broad
> customer portal, or native app — those are Releases 1–3. The project is
> deployable at every milestone. See
> [`docs/RELEASE_0_ACCEPTANCE.md`](docs/RELEASE_0_ACCEPTANCE.md) for the
> acceptance-criteria evidence and the launch gate.

## What's here

| Area | State |
|---|---|
| Premium responsive marketing site (10 public routes) | Complete, builds statically |
| Coded, interactive product preview + sample briefing | Complete |
| Stripe Checkout (test mode) + verified, idempotent webhook | Complete, behind a typed adapter |
| Confirmation page (idempotent order finalization) | Complete |
| Secure multi-step onboarding with save-and-resume + consent | Complete |
| Orders / families / children / consent data model | Complete (Supabase migration + typed store) |
| Transactional email (customer confirmation + ops notice) | Complete, behind a provider adapter |
| Protected operations console (paid orders + onboarding status) | Complete |
| Privacy-safe funnel analytics | Complete |
| Unit + integration + E2E tests | 31 unit/integration, 21 E2E smoke |

## Requirements

- Node.js 22+
- For the features that need them: a Supabase project, a Stripe account, and a
  transactional email provider (Resend or Postmark)

**The marketing site runs with no configuration at all.** Server features report
a clear `NOT_CONFIGURED` error rather than failing silently. Locally, orders and
onboarding fall back to an in-memory store (clearly labelled; does not persist).

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in what you have; nothing is required to browse
npm run dev                    # http://localhost:3000
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest unit + integration suite |
| `npm run test:e2e` | Playwright E2E smoke tests (builds + serves) |
| `npm run format` / `format:check` | Prettier |
| `npm run verify` | format:check → lint → typecheck → test → build |

## Configuration

All configuration is by environment variable — see
[`.env.example`](.env.example) for the annotated list. Key points:

- **Secrets are server-only.** Nothing secret is exposed to the browser. Only
  `NEXT_PUBLIC_*` values are inlined client-side.
- **Stripe** needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
  `STRIPE_RESCUE_PRICE_ID` for checkout to function.
- **Supabase** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) enables durable
  persistence. Run the migration in `supabase/migrations/` first.
- **Email** defaults to a `console` provider (logs, never sends). Set
  `EMAIL_PROVIDER=resend|postmark` plus `EMAIL_PROVIDER_API_KEY` to send.
- **Operations console** at `/ops` is gated by `OPS_ACCESS_TOKEN`. Without it,
  `/ops` is inaccessible in production (and open with a warning banner in dev).
- **Pricing is configuration**, not hard-coded — see `src/lib/config/offers.ts`.

## Architecture

Next.js App Router + TypeScript (strict) + Tailwind CSS v4. External services
sit behind typed adapters so they can be swapped:

```
src/
  app/
    (marketing)/        Public routes: home, how-it-works, sample-briefing,
                        pricing, security, faq, get-started, sign-in,
                        privacy, terms
    confirmation/       Post-checkout confirmation (idempotent finalize)
    onboarding/[token]/ Secure multi-step onboarding
    ops/                Protected operations console
    api/
      checkout/rescue/  Create a Stripe Checkout Session
      webhooks/stripe/  Verified, idempotent webhook
      onboarding/[token] Save-and-resume + complete
      ops/session/      Operator sign-in
      analytics/        Privacy-safe funnel sink
  components/           marketing / onboarding / operations / shared
  lib/
    billing/            Stripe adapter (BillingProvider)
    database/           DataStore interface + Supabase + in-memory stores
    notifications/      NotificationProvider (console / resend / postmark)
    onboarding/         Zod validation
    config/             offers, site, faq (the source of truth for pricing)
    security/           rate limiting
    ops/                operator auth
supabase/migrations/    Release 0 schema + Row Level Security
tests/                  unit + integration (Vitest)
e2e/                    Playwright smoke tests
docs/                   PRD, traceability, acceptance, SOP
```

### Payment flow (idempotency)

`checkout → Stripe hosted page → webhook + confirmation page`. Both the webhook
and the confirmation page call one idempotent order service keyed on the Stripe
checkout session id, so **a paid session creates exactly one order** regardless
of duplicate webhook delivery or which path arrives first. Webhook signatures
are verified against the raw body; a second dedup guard records processed event
ids.

## Trust & safety

School Inbox handles family information, so trust requirements are built in, not
bolted on: data minimization (nickname/initials, no DOB, no portal credentials,
no card storage), server-only secrets, verified webhooks, private-by-default
data, rate-limited public endpoints, and an audit log for privileged actions.
The site makes **no compliance claims** (FERPA/COPPA/PIPEDA/SOC 2/HIPAA) and
shows **no fabricated proof**. See [`SECURITY.md`](SECURITY.md).

## Not yet done (later releases)

Inbound forwarding aliases, OCR, schema-constrained AI extraction, the human
review queue, the customer portal (`/app/*`), subscriptions/Care billing, and
durable background jobs. The interfaces (`InboundEmailProvider`,
`ExtractionProvider`, etc.) are anticipated by the adapter boundaries but not
implemented in Release 0.
