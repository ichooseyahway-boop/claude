# Security & Privacy (Release 0)

School Inbox processes family and child-related information, so trust is a
product requirement. This document summarizes the security posture implemented
in Release 0 and what is deliberately deferred. It is developer-facing; the
customer-facing version is at `/security`.

## Reporting

Report a suspected vulnerability or data-handling concern to
**security@schoolinbox.example** (replace with the operator address at launch).
Please do not open public issues for security reports.

## Data minimization (PRD §16.1)

- Children are identified by **nickname or initials** — full legal names are
  never required, and no date of birth is collected.
- **No school-portal credentials** and **no full-inbox access** are requested.
- **No card data** is stored — payment is handled entirely by Stripe's hosted
  checkout.
- Prohibited materials (medical, custody, legal, immigration,
  special-education, financial-account) are refused; onboarding requires explicit
  acknowledgment of this boundary.

## Application security (PRD §16.2)

- **Server-only secrets.** Secret access is centralized in `src/lib/env.ts`
  (guarded by `server-only`). Only `NEXT_PUBLIC_*` values reach the browser.
- **Verified webhooks.** The Stripe webhook verifies the signature against the
  raw request body before any processing.
- **Idempotent processing.** Order creation is keyed on the Stripe checkout
  session id; webhook event ids and notification sends are deduplicated. Replays
  cannot create duplicates.
- **Row Level Security.** Every family table has RLS enabled and forced. Release
  0 has no browser database access, so the default deny (service-role-only) is
  the correct posture; customer SELECT policies arrive with the portal.
- **Private storage.** No public buckets; the schema anticipates
  authorization-gated, signed access for later releases.
- **Rate limiting** on checkout, onboarding, and operator sign-in endpoints.
- **Operator gate.** `/ops` is protected server-side by `OPS_ACCESS_TOKEN`
  (constant-time comparison; opaque httpOnly cookie). Inaccessible in production
  without a token.
- **Audit log.** Privileged actions (order creation, onboarding completion,
  operator sign-in) are recorded append-only.
- **Security headers.** CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, and a
  restrictive `Permissions-Policy` are set on every response.
- **Untrusted content.** Source content is always treated as data, never as
  instructions — the foundation for the prompt-injection defenses that land with
  extraction in Release 2.

## No unearned claims (PRD §16.5)

The product makes **no** FERPA, COPPA, PIPEDA, SOC 2, CASA, or HIPAA compliance
claim, and displays **no** fabricated testimonials, ratings, logos, customer
counts, or time-saved statistics. Current controls and not-yet-implemented
controls are listed separately on `/security`.

## Deferred to later releases

Formal third-party audit and penetration test, published sub-processor list and
DPAs, operator SSO / hardware keys, automated retention-deletion jobs with
verifiable receipts, and regional data residency. These are listed on `/security`
under "not yet implemented" so the site never implies they exist today.

## Retention (PRD §16.4)

- Raw source content and attachments: deleted **30 days after delivery** by
  default (sooner on request; held only for a documented dispute).
- Extracted plan: retained while the account is active or until deletion.
- Audit records: retain only the metadata needed for accountability; never the
  deleted source content.

This policy requires legal review before public launch and must match the
implemented deletion job (Release 3).
