# Release 0 — Acceptance & Launch Gate

Maps every Release 0 acceptance criterion (PRD §19) and launch-gate item
(PRD §24) to concrete evidence in this repository.

## Acceptance criteria (PRD §19)

| Criterion | Evidence |
|---|---|
| A visitor can understand the offer and price on mobile and desktop | Home + Pricing pages; E2E `marketing.spec.ts` asserts headline, `$149`, and no horizontal overflow at desktop and 390px |
| A test customer can complete payment using Stripe test mode | `POST /api/checkout/rescue` creates a Stripe Checkout Session; `get-started` redirects to hosted checkout; success returns to `/confirmation` |
| A verified webhook creates exactly one order even after repeated delivery | Idempotent order service keyed on the checkout session id + webhook event-id dedup; tests: `memory-store.test.ts`, `orders.test.ts`, `webhook-signature.test.ts` |
| A customer can complete onboarding and add two children | `/onboarding/[token]` multi-step flow with save-and-resume; tests: `onboarding-schema.test.ts` (two children), `memory-store.test.ts` (materializes two children) |
| Operations can identify paid orders awaiting materials | `/ops` console: metrics for paid / awaiting onboarding / ready for materials, plus a per-order table |
| No fabricated testimonials, ratings, or customer statistics appear | No testimonial/rating/logo components exist; E2E `marketing.spec.ts` asserts their absence |
| Accessibility smoke tests pass | E2E asserts `lang`, single `h1`, skip link; semantic landmarks, labelled forms, visible focus, ≥44px targets throughout |
| Production build succeeds without TypeScript or lint errors | `npm run verify` (format:check → lint → typecheck → test → build) |

## Premium design acceptance gate (PRD §9.1B)

| Gate item | How it's met |
|---|---|
| Inspected at 1440/1280/1024/768/390/375 | Screenshots captured at all six widths during build verification |
| Hero communicates product, customer, outcome, action without scrolling | Section 1 hero: eyebrow, headline, supporting copy, two CTAs, trust line, coded preview |
| Coded product preview readable and interactive on mobile | `HeroPreview` + `SampleBriefing` are coded components with source drawers; stack cleanly at 390px |
| No section looks like an unchanged component-library example | Each homepage section uses a distinct editorial composition (asymmetric grids, dark panels, comparison table, layered preview) |
| One token system across spacing/type/buttons/forms/cards/nav/dialogs/emails | `globals.css` design tokens; shared `Button`, `forms`, `ui`, and email templates all read the same palette |
| Hover/focus/active/disabled/loading/success/warning/error states designed | Buttons (all states), forms (invalid/focus), checkout (loading/error), confirmation (ok/pending/missing), onboarding (per-step errors + success) |
| No horizontal overflow, clipped text, broken links, or console errors | E2E overflow checks; all footer/nav links resolve to real routes; custom 404 |
| Distinguishable from a generic SaaS starter within five seconds | Editorial serif accents, warm canvas palette, custom icon family, custom wordmark, "noise becoming a plan" motif |

## Launch gate (PRD §24) — status

| Item | Status |
|---|---|
| Test payment completes successfully | Ready — requires Stripe test keys in the environment |
| Duplicate Stripe webhook delivery creates one order | **Verified** by tests |
| Confirmation and onboarding links work | **Verified** — confirmation finalizes idempotently; onboarding resolves by token |
| Mobile checkout return flow works | Confirmation page is responsive; returns via `success_url` |
| Legal pages contain no obvious placeholders | Privacy + Terms written; **clearly banner-marked "pending legal review"** (required before public launch) |
| Price, scope, turnaround, refund/cancellation terms agree everywhere | All sourced from `offers.ts`; consistent across home, pricing, get-started, emails |
| Operations receives a paid-order notification | `sendOpsPaidOrder` (needs `OPERATIONS_NOTIFICATION_EMAIL` + email provider) |
| Customer receives a confirmation | `sendCustomerConfirmation` (idempotent) |
| No fake testimonials, ratings, logos, or metrics | **Verified** |
| Forms have labels, errors, and keyboard support | **Verified** — `forms.tsx` associates labels + errors; keyboard-navigable |
| Production build passes | **Verified** |
| Monitoring and support contact active | Support/security/privacy addresses present; error-monitoring DSN slot reserved |
| Manual delivery SOP ready | [`MANUAL_DELIVERY_SOP.md`](MANUAL_DELIVERY_SOP.md) |
| Capacity limit reflects real operational capacity | `site.foundingFamilyCapacity` — a real configurable count, not a countdown |

## Before public launch (owner action)

1. Provision production Supabase, Stripe, and email accounts; set the env vars.
2. Run the migration in `supabase/migrations/`.
3. Have counsel review and finalize Privacy + Terms (remove the draft banner).
4. Complete a live Stripe test-mode purchase end-to-end.
5. Set `OPS_ACCESS_TOKEN` and a real `OPERATIONS_NOTIFICATION_EMAIL`.
