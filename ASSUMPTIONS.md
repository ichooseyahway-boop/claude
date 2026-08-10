# Assumptions and implementation decisions

Required by PRD 1.1 rule 10: every implementation decision not explicitly settled by the PRD.

Each entry states the decision, why it went that way, and what would change it.

---

## A-01 · TypeScript 5.9 rather than 7.0

**Decision.** Pinned `typescript@5.9.3`.

**Why.** TypeScript 7.0 (the Go port) is stable-released and would satisfy PRD 1.1 rule 2's "current
stable versions". It is also very new, and Next.js 16's generated route types have not been broadly
validated against it. PRD 1.1 rule 2 also forbids dependencies that put the build at risk, and a
toolchain failure in the type checker would block the launch gate for a reason unrelated to the
product.

**Revisit when.** Next.js publishes explicit TS 7 support. The upgrade is a version bump plus a full
`npm run verify`.

## A-02 · Hand-rolled i18n instead of a library

**Decision.** Typed message catalogues in `src/lib/i18n/`, no `next-intl` or `react-i18next`.

**Why.** The launch gate requires a French missing-key count of exactly zero (PRD 26.3), and
FR-I18N-001 forbids a silent English fallback in a released French page. Deriving the catalogue type
from the English object makes a missing key a **compile error** rather than a runtime warning. Most
i18n libraries treat a missing key as a fallback, which is precisely the behaviour the PRD
prohibits. A dependency would have to be configured to fail closed; a type does it by default.

**Cost.** No ICU message format, no automatic pluralization. Neither is needed by the current copy;
`Intl.PluralRules` is available if it becomes needed.

## A-03 · `X-Robots-Tag` is scoped, not global

**Decision.** `noindex` applies to `/app`, `/ops` and `/api` only, not to every route.

**Why.** FR-RPT-005 forbids public search indexing of reports, and no authenticated surface should be
crawlable. But FR-MKT-001 requires working canonical and hreflang handling, which only matters on an
indexable site. A blanket `noindex` would have silently defeated the marketing requirement.

## A-04 · SSRF protection is split into two calls

**Decision.** `assertSafeUrl()` validates the URL; `assertSafeResolvedIps()` must be called
separately by the fetch layer with the resolved addresses.

**Why.** URL validation alone cannot stop DNS rebinding — a hostname that resolves to a public
address when checked and a private one when connected. Closing that requires checking after
resolution and pinning the checked address for the socket. Presenting this as one "safe" function
would imply a guarantee the code cannot make.

**Consequence.** The API adapter (not yet built) **must** call both, and must use
`redirect: 'manual'` with re-validation on each hop. This is recorded here because it is an
obligation on code that does not exist yet.

## A-05 · Emails and phone numbers do not block a report release

**Decision.** `RELEASE_BLOCKING_KINDS` covers cards, SINs, API keys, bearer tokens, private keys,
JWTs and password assignments — not emails or phone numbers.

**Why.** FR-RPT-003 blocks release on "secrets or unredacted restricted data". A report legitimately
names an escalation contact; blocking on every email address would fire on nearly every report, and
a gate that always fires is a gate reviewers learn to click through. Making it precise keeps it
meaningful.

## A-06 · Billing administrators need an explicit project grant

**Decision.** `app.can_access_project()` excludes `billing_admin` from the ordinary
organization-member branch; a billing administrator reaches a project only via an explicit
`project_scope`.

**Why.** PRD 7.6 says billing administrators cannot view transcripts or reports "unless separately
granted project access". Organization membership is not a separate grant — it is the ordinary one.
The first version of this function treated them as ordinary members; the database test suite caught
it.

## A-07 · Unscorable ≠ zero

**Decision.** A case with no applicable dimensions throws rather than scoring 0, and an unscorable
case requires a documented reason.

**Why.** PRD 10.3 excludes N/A dimensions from the denominator, and 10.6 treats unscorable cases as a
completeness problem, not a quality problem. Scoring a case 0 because it could not be run would
report a system failure as a system defect — the customer would be told their bot failed when in
fact the test never reached it.

## A-08 · A cap is reported even when the score is already below it

**Decision.** `determineScoreCap` result is returned regardless of whether it actually lowered the
score.

**Why.** PRD 10.6 requires a cap to be "visible in the report with the reason". A run scoring 20 with
a confirmed critical finding still has a critical finding, and the reader needs to know the grade is
capped rather than merely low.

## A-09 · Only *confirmed* critical findings cap the score

**Decision.** `FindingForCap.confirmed` must be true for the 49/F cap.

**Why.** PRD 10.6 says "any confirmed Critical finding". FR-EVAL-001 says AI proposals are never
directly client-visible, and FR-EVAL-005 requires explicit analyst confirmation for critical
severity. An unconfirmed AI-proposed critical must not fail a customer's audit before a human has
looked at it.

## A-10 · Authorization and release gates fail closed on missing context

**Decision.** `evaluateTransition` refuses execution when `authorizationActive` is absent, and
refuses release when `releaseChecklistSatisfied` is absent — not only when they are `false`.

**Why.** A caller that forgets to pass context is the likely failure mode, not a caller that passes
`false`. Defaulting to permissive would mean a forgotten parameter starts an unauthorized test.

## A-11 · Migration ordering: helpers after their tables

**Decision.** Membership-based helper functions live in `0003_authorization_helpers.sql`, after the
tables, rather than beside the enums in `0001`.

**Why.** PostgreSQL validates a `language sql` function body at creation time, so a helper selecting
from `public.memberships` cannot be created before that table exists. The alternative —
`set check_function_bodies = off` — would suppress a genuinely useful check for every function in
the file.

## A-12 · Explicit grants, revoking Supabase's defaults

**Decision.** `0007_grants.sql` revokes default privileges on `public` from `anon` and
`authenticated`, then grants table by table.

**Why.** Supabase's bootstrap sets permissive defaults, so a newly created table is readable by
signed-in users before anyone decides it should be. PRD 7.7 is "deny by default". The trade-off is
that adding a table now requires adding a grant — which is the intended friction.

## A-13 · A local Supabase shim for database tests

**Decision.** `supabase/test/00_supabase_shim.sql` creates a minimal `auth` schema, `auth.uid()` and
the PostgREST roles, so migrations can be applied to a plain PostgreSQL cluster.

**Why.** PRD 20.1 requires database tests for constraints and RLS, and PRD 21.1 makes them a CI step.
Without the shim those tests could only run against a live Supabase project, which is too slow and
too stateful for per-pull-request CI. The shim is never applied to a Supabase project.

## A-14 · Legal routes carry a placeholder, not drafted terms

**Decision.** The legal pages show the `LEGAL_REVIEW_REQUIRED` banner and a one-paragraph note, not
draft terms of service.

**Why.** FR-LEGAL-002 requires the routes to exist and to carry the review status. Generating
plausible-looking terms would produce a document that reads as a real agreement to both a customer
and the owner, and PRD 28 lists "legal placeholders published as approved legal advice" as grounds
for rejecting the handoff. An obviously incomplete page is safer than a convincing one.

## A-15 · Package prices in configuration, referenced not enforced

**Decision.** `SERVICE_PACKAGES` holds display amounts; no domain logic reads them.

**Why.** PRD 6 requires prices in configuration and provider price records, not hard-coded in
business logic. The amounts here drive the pricing page and seed `service_packages`; a charge is
always created from the provider price ID named in `providerPriceIdEnvVar`.

## A-16 · Analytics property values are typed, not free-form

**Decision.** `AnalyticsProvider.track` accepts `string | number | boolean` values only, and the
adapter is specified to reject prose-shaped strings.

**Why.** PRD 19.4 forbids sending transcript text, prompt text, policy content, finding narrative,
credentials and uploaded filenames to analytics. A `Record<string, unknown>` would make that a
convention; a narrow type plus adapter validation makes it a control.

## A-17 · System font stack, no webfont

**Decision.** `--font-sans` is a system stack.

**Why.** PRD 17.3 warns against a third-party font that creates privacy or performance problems, and
the CSP restricts `font-src` to `'self'`. Every family in the stack has complete French accent
coverage. Self-hosting a brand font later is a token change plus a CSP entry.

## A-18 · Server-component chrome, no client-side menu

**Decision.** The header, footer and language switcher are server components with no client
JavaScript; the mobile navigation wraps rather than collapsing behind a toggle.

**Why.** PRD 17.1 requires full keyboard operation, visible focus and accessible menus. A wrapping
link list satisfies all three with no JavaScript and no ARIA to get wrong. A disclosure menu would
need client state and correct focus management for no functional gain at this page count.

---

## Open questions for the owner

These need a decision before the corresponding work can be completed correctly:

1. **Legal entity and payment account.** Stripe configuration, tax behaviour and the refund policy
   all depend on the registered business. No production billing work should start first.
2. **Data residency.** `organizations.data_region_preference` exists but nothing enforces it. If
   Canadian data residency will be offered contractually, the Supabase region and the AI provider's
   processing location must be chosen deliberately — this affects the Quebec Law 25 analysis in
   PRD 16.7.
3. **AI provider selection.** `AI_PROVIDER` currently accepts `echo` (offline stub). The production
   choice determines the subprocessor register, the no-training configuration and the cost model.
4. **Whether the analyst role is ever a contractor.** If so, PRD Appendix E's contractor
   confidentiality agreement is required, and `project_scope` on memberships becomes the mechanism
   for limiting their reach.
5. **Retention periods.** The `.env.example` values are the PRD's product defaults, explicitly not
   legal conclusions. An accountant and counsel must confirm them.
