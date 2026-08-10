# Assumptions

Implementation decisions taken where the PRD left a choice open, as required by
PRD 1.1.10. Each entry states the decision, why, and what would change it.

---

## A-001 — Locale segments in URLs are `en` and `fr`, not `en-CA` and `fr-CA`

**Decision.** Routes are `/en/pricing` and `/fr/pricing`; the locale *codes*
remain `en-CA` and `fr-CA` everywhere else, including `lang` attributes,
`hreflang` values and stored preferences.

**Why.** Section 11.1 specifies `/{locale}` without fixing the segment format.
Short segments are conventional and read better in shared links, while the full
BCP-47 tag is what actually matters for formatting and accessibility.

**Reversal cost.** Low — `LOCALE_SEGMENTS` in `src/lib/i18n/locales.ts` is the
only place that maps between them.

## A-002 — Route paths are not translated

**Decision.** `/fr/pricing`, not `/fr/tarifs`.

**Why.** FR-MKT-001 requires that "language switching preserves the equivalent
route". A shared locale-independent path makes that a structural property
rather than a per-page mapping table that will eventually drift. It also keeps
analytics comparable across locales.

**Trade-off.** Slightly weaker French SEO. Revisit if French organic search
becomes a meaningful acquisition channel; a slug map would live in
`src/config/routes.ts`.

## A-003 — Message catalogs are TypeScript modules, not JSON or an i18n library

**Decision.** `src/lib/i18n/messages/*.ts`, with the French catalog typed
against the English one.

**Why.** PRD 26.3 sets a target of zero missing French keys at launch. Typing
the catalogs turns that from a test you have to remember to run into a compile
error. A runtime i18n library would have caught it later, if at all.

**Trade-off.** Copy changes require a deploy. Acceptable at this stage; a CMS
becomes worth it when a non-developer edits marketing copy regularly.

## A-004 — `next-intl` and similar libraries were not adopted

**Decision.** Hand-rolled locale resolution and `Intl` formatting.

**Why.** The requirement is two locales, static pages and no runtime locale
negotiation. The library's value is mostly in features this product does not
need, and PRD 1.1.2 discourages dependencies for authentication, billing and
security-adjacent paths — keeping the dependency surface small has a cost of
roughly 80 lines here.

## A-005 — Severity caps apply only to *confirmed* findings

**Decision.** `determineCaps` ignores unconfirmed candidates and resolved
findings.

**Why.** Section 10.6 says "Any confirmed Critical finding caps the overall run
score at 49". An AI-proposed Critical that no human has adjudicated is a
candidate, not a finding (FR-EVAL-001), and letting it cap a customer's grade
would publish an unreviewed machine judgment as a verdict.

## A-006 — Unscorable cases are excluded from the average, not counted as zero

**Decision.** A case that timed out or could not be scored is excluded from the
weighted mean but counted toward the 20% incompleteness threshold.

**Why.** A timeout is missing information, not evidence of a bad answer.
Counting it as zero would fabricate a failure. Section 10.6's incompleteness
rule already exists to stop a small sample from hiding a gap, so the gap is
reported rather than scored.

## A-007 — Exactly 20% unscorable is *not* incomplete

**Decision.** The run is incomplete when the ratio is strictly greater than
0.20.

**Why.** Section 10.6 says "more than 20%". Tested explicitly in
`score.test.ts` so the boundary is not accidentally changed.

## A-008 — Wildcard host allowlists cover subdomains only, never the apex

**Decision.** `*.example.ca` matches `api.example.ca` but not `example.ca`.

**Why.** Authorizing a wildcard for an API subdomain should not silently
authorize whatever runs on the apex domain, which is frequently a different
service on different infrastructure. FR-RUN-003 requires an allowlist; the
narrower reading is the safer one.

**Reversal cost.** Low, but reversing weakens authorization scope — treat as a
security decision, not a convenience one.

## A-009 — The rate limiter is in-memory

**Decision.** `InMemoryRateLimiter` backs the contact form and sign-in limits.

**Why.** Correct for development and a single instance, and it keeps a Redis
dependency out of the build before there is traffic to justify it.

**This is a known production gap.** On a multi-instance deployment the
effective limit multiplies by the instance count. `RateLimiter` is an interface
precisely so a shared-store implementation can replace it without touching call
sites. Fix before enabling autoscaling.

## A-010 — Rate-limit keys are salted hashes of the client address

**Decision.** The IP is hashed with a per-purpose salt and never stored or
logged.

**Why.** 16.3 requires collecting only what the job needs. Rate limiting needs
a stable identifier, not an address, and per-purpose salts stop one form's
traffic from exhausting another's budget.

## A-011 — Legal approval status is source code, not configuration

**Decision.** `src/config/legal.ts` holds `approvalStatus` per document, and it
cannot be overridden by an environment variable.

**Why.** FR-LEGAL-002 makes unapproved legal text a launch blocker. If it were
an environment toggle, "counsel approved this" would be something anyone with
deploy access could assert. As code it requires a reviewed commit naming the
approver and date.

## A-012 — Readiness fails in production while legal documents are unapproved

**Decision.** `/api/health/ready` returns 503 in production if any document is
still `LEGAL_REVIEW_REQUIRED`.

**Why.** It converts a checklist item into an enforced gate. A production
deployment that skipped legal review will not pass its own health check.

## A-013 — Clients cannot see draft reports at the database row level

**Decision.** The `reports_read` RLS policy restricts client roles to
`released` and `superseded` rows.

**Why.** 7.7 says "Never rely on hidden buttons as authorization". Filtering
drafts in the API would work until one query forgets the filter; filtering them
in RLS means the row is not returned to a client session at all.

## A-014 — Billing-only members are computed, not a flag

**Decision.** `app_is_billing_only()` returns true when a user's only active
membership in an organization is `billing_admin`.

**Why.** 7.6 says a Billing Administrator cannot view test content "unless
separately granted project access". Deriving it from memberships means granting
a second role automatically lifts the restriction, with no flag to forget.

## A-015 — The Platform Owner can drive every run transition an analyst can

**Decision.** `platform_owner` appears in the role list for `queued → running`
and `running → review_required`.

**Why.** Persona 7.1 gives the owner complete operational control, and in a
one-person business the owner frequently *is* the analyst. The restrictive
reading would have made the owner unable to run their own audits.

## A-016 — Customers cannot set a finding to `resolved`, `partially_resolved` or `regressed`

**Decision.** Those three statuses require an internal role.

**Why.** They assert a *verified* outcome. FR-FND-004 defines
`ready_for_retest` as the customer's signal; letting a customer mark their own
finding resolved would make the retest ceremonial.

## A-017 — Analytics is the only provider whose unconfigured state is success

**Decision.** `noopAnalyticsProvider.track()` returns `{ok: true, recorded: false}`;
every other unconfigured provider returns `NOT_CONFIGURED`.

**Why.** Analytics is optional and consent-gated (19.4); dropping an event is
correct behaviour. Every other provider's absence is a real failure the caller
must handle.

## A-018 — Card-number detection uses a Luhn check

**Decision.** The sensitive-pattern check only fires on digit sequences that
pass Luhn validation.

**Why.** Order numbers, tracking numbers and phone strings are commonly 13–19
digits. Without Luhn, the critical-severity check fires constantly and reviewers
learn to dismiss it — a check nobody trusts is worse than no check.

## A-019 — Deterministic language detection is a keyword heuristic

**Decision.** A small marker-word list, not a language-detection library.

**Why.** The check only needs to answer "did a French scenario get an English
answer?" for text that is usually a full sentence of customer-service prose.
It creates a *candidate* for analyst review, never a finding, so a false
positive costs one glance.

**Revisit if.** The false-positive rate on short responses proves annoying in
practice; a proper detector is a drop-in replacement.

## A-020 — Test fixtures use a dedicated package code

**Decision.** `rls_tenant_isolation.sql` inserts `rls_fixture_package`, not
`essential_audit`.

**Why.** So the suite runs against a database that has already loaded
`seed.sql` without colliding on `service_packages.code`. Found by running it.

## A-021 — `/status` is not locale-prefixed

**Decision.** `/status`, matching section 11.1 exactly.

**Why.** The URL appears in incident communications and uptime monitors, where
stability matters more than localization. The page renders in the default
locale.

## A-022 — The status page reports "unknown", not "operational"

**Decision.** Every component shows `unknown` until real uptime data is wired
in.

**Why.** Section 4.4 prohibits unsupported claims. A green tick that no
monitoring produced is exactly that, and it is the kind of thing customers
check during an outage.

## A-023 — TypeScript 5.9, not 8.x

**Decision.** Pinned to `typescript@5.9.3`.

**Why.** `eslint-config-next` and the TypeScript ESLint toolchain are validated
against the 5.x line. PRD 1.1.2 forbids beta dependencies in
security-sensitive paths; a compiler change is broader than that.

## A-024 — CI workflow committed; branch protection and deployment are not

**Decision.** `.github/workflows/ci.yml` runs all ten PRD 21.1 steps on every
pull request and on pushes to `main`. `npm run ci` runs the same sequence
locally. The dependency-audit threshold is `high` over production dependencies
only (`npm audit --omit=dev --audit-level=high`).

**Why that threshold.** PRD 21.1 requires a "documented threshold" and does not
name one. `high` on production dependencies is the level where a finding
plausibly reaches a customer. Including dev-only advisories would block releases
on tooling that never ships, and a gate that fires on things nobody can act on
is a gate people learn to bypass. Moderate and low advisories still appear in
the log; they simply do not fail the build.

**Still not configured, deliberately.**

- *Branch protection and owner approval.* PRD 21.1 requires "passing CI and
  owner approval" for protected production deployment. Which branches are
  protected, and whether approval is required to merge, are repository settings
  rather than file contents — this workflow supplies the CI half only.
- *Deployment.* No hosting provider has been chosen. A deploy step that guessed
  one would either fail on first run or, worse, succeed against something
  unintended.

**Owner action required.** Enable branch protection on `main` requiring the
`Verify` check and owner review, then choose a hosting provider before a deploy
job is added.

## A-030 — Multiple root layouts, so `lang` is on `<html>`

**Decision.** There is no `src/app/layout.tsx`. Three route groups each carry
their own root layout: `(public)/[locale]` for the marketing site,
`(standalone)` for `/` and `/status`, and `(authenticated)` for `/app` and
`/ops`.

**Why.** The locale layout previously set `lang` on an inner `<div>`. That
satisfies WCAG 3.1.2 (Language of Parts) and leaves 3.1.1 (Language of Page)
unmet, so a screen reader announces the entire French site with English
pronunciation. `lang` has to be on `<html>`, and in the App Router only a root
layout renders `<html>` — a root layout cannot read route params, so the only
way to know the locale there is to have several root layouts. Found by an E2E
smoke test asserting `html[lang]`, not by review.

The alternative — one root layout reading the path from a middleware header —
would have opted the whole marketing site into dynamic rendering to fix an
attribute. The public pages are still prerendered after this change.

## A-031 — `/app` and `/ops` are `force-dynamic`

**Decision.** The authenticated root layout sets
`export const dynamic = 'force-dynamic'`.

**Why.** Without it, Next prerenders those routes at build time — when there is
no session — and serves that build-time output to every visitor. Today the
output is only a redirect, so the effect is invisible; the moment a PostgreSQL
`DataStore` exists it would become one customer's page cached and served to
everyone. This is the class of bug that does not announce itself in testing,
which is why it is pinned rather than left to the default.

## A-025 — `effort`, not `temperature`, for the evaluator

**Decision.** `src/integrations/anthropic/evaluator.ts` sends
`output_config.effort: 'medium'` and does not send `temperature`, `top_p` or
`top_k`.

**Why.** PRD 15.6 asks for "low temperature or equivalent for evaluation". On
the current Claude models those three sampling parameters have been removed and
the API rejects a request carrying any of them with a 400. `effort` is the
supported control, and it is the "or equivalent" the PRD allows for. Determinism
of the *output shape* is enforced separately and more strongly, by the
structured-output JSON schema plus `validateEvaluatorOutput`, which is what the
pipeline actually depends on.

**Deviation, deliberate.** Recorded here rather than silently, because a reader
comparing the adapter against 15.6 would otherwise think the requirement was
skipped.

## A-026 — Services authorize through `permit()`, never `authorize()` directly

**Decision.** `src/domain/services/context.ts` exports `permit(context, ...)`,
which binds `context.now()` into the authorization call. Service modules import
that and never call `authorize` directly.

**Why.** `authorize` falls back to `new Date()` when no clock is supplied, so a
direct call evaluates the step-up re-authentication window (7.7) against
wall-clock time while the rest of the same request uses the injected clock. Two
clocks in one authorization decision is a correctness bug and it makes the
window untestable. Found by a failing test, not by review.

## A-027 — `db:test` must not run as root

**Decision.** `scripts/db-test.sh` exits with an explanatory message when run as
root.

**Why.** `initdb` refuses to run as root, so the temporary cluster cannot start.
The script previously failed with a bare non-zero exit that looked like a test
failure. Pass `DATABASE_URL` to test an existing database instead.

## A-028 — No PostgreSQL `DataStore`, and the in-memory one never serves production

**Decision.** `src/data/store.ts` returns the in-memory store in development and
test, and throws `DataStoreNotConfiguredError` in production — including when
Supabase credentials are present, because the repositories that would use them
are not written yet.

**Why.** The schema, RLS policies and isolation suite are done and verified
against a real PostgreSQL 16 cluster, but the repository implementations on top
of them are not. Falling back to the in-memory store in production would render
screens while silently discarding every write between requests, which is worse
than an outage: the customer would not know their data was gone.

**Owner action required.** Implementing `DataStore` against Supabase is the
single largest remaining piece of work, and it needs a provisioned project.

## A-029 — `getUser()`, not `getSession()`

**Decision.** `readSupabaseIdentity` calls `supabase.auth.getUser()`.

**Why.** `getSession()` returns the contents of the session cookie without
contacting the auth server, so a forged or tampered cookie would be believed.
`getUser()` validates the token. The cost is a network call per request; the
alternative is an authentication bypass.
