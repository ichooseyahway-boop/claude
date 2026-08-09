# Test Plan

PRD ref: section 20.

## Current coverage

| Layer | Status | Count | Command |
|---|---|---|---|
| Unit (domain rules) | Implemented | 194 | `npm test` |
| Database constraints and RLS | Implemented | 27 assertions | `npm run db:test` |
| Type checking | Implemented | — | `npm run typecheck` |
| Lint / format | Implemented | — | `npm run lint`, `npm run format:check` |
| Production build | Implemented | — | `npm run build` |
| Integration (auth, billing, storage, email, AI) | **Not written** | 0 | — |
| End-to-end | **Not written** | 0 | — |
| Accessibility (automated + manual) | **Not written** | 0 | — |
| Security (SSRF, upload, webhook forgery) | Partial — SSRF guard unit-tested; no request-level tests | — | — |
| Localization | Implemented (key parity, placeholders, prohibited claims) | included above | `npm test` |
| Visual regression | **Not written** | 0 | — |
| Load | **Not written** | 0 | — |
| Backup restore | **Not performed** | — | — |

Everything marked "not written" is blocked either on vendor accounts or on the
authenticated UI that does not exist yet.

## What the unit suite actually verifies

### Scoring (`src/domain/scoring/`)

- Dimension weights total 100; a malformed rubric throws rather than silently
  rescaling every score.
- Case score honours weights; a uniform 3 scores 60; N/A dimensions are excluded
  from the denominator and require a documented reason.
- Grade band boundaries at 90/80/70/60.
- Severity caps: confirmed Critical → 49/F; unresolved High in a capped
  dimension → 69/D; the strictest cap wins; a cap never *raises* a score;
  unconfirmed candidates and resolved findings do not cap.
- Incompleteness: >20% unscorable withholds the grade; exactly 20% does not;
  an owner-approved exception restores it.
- Empty runs and all-N/A cases return null rather than zero.

### Parity (`src/domain/scoring/parity.ts`)

- Band boundaries at 95/85/70.
- No numeric index below ten valid matched pairs, including when exclusions
  push the count under the threshold.
- Pairs where either side was unscorable are excluded, not counted as a
  100-point gap.
- Risk weighting; identification of which locale is served worse.

### Run state machine (`src/domain/runs/`)

- The documented happy path.
- `released` is terminal except `superseded` — verified against every state.
- Role gating: a plain analyst cannot approve a plan or release a report.
- Exceptional transitions require a non-blank recorded reason.
- The kill switch blocks `queued` and `running` but leaves review, reporting and
  release working.
- The release gate reports all nine blockers at once, not the first.

### Findings (`src/domain/findings/`)

- Critical always requires senior confirmation; low-confidence High escalates;
  High privacy and fairness findings escalate.
- Nothing is releasable without at least analyst confirmation.
- An unconfirmed low-confidence Critical publishes as High (PRD 10.8).
- Critical alerts never carry evidence; the customer notice waits for human
  confirmation.
- Risk acceptance requires Client Owner identity, a reason and a review date.
- Customers cannot mark their own findings resolved.

### Entitlements (`src/domain/entitlements/`)

- Package reference prices and inclusions match section 6.
- Limits block the unit that would exceed them; overage is reported, never
  silent.
- A single-language plan may test either language but not both.
- Retest window, scenario limit and included-count enforcement.
- Monitoring blocked on one-time packages.

### Billing webhooks (`src/domain/billing/`)

- A replayed event is skipped (E2E scenario 3).
- A failed payment does not grant an entitlement (E2E scenario 4).
- Out-of-order events do not overwrite newer state.
- Dead-lettering after repeated failure, with an alert before that point.
- A cancelled subscription schedules an end rather than revoking immediately.

### Deterministic checks (`src/domain/checks/`)

All ten check types from PRD 10.9, plus: Luhn validation so order numbers are
not reported as card numbers, escalation markers recognised in both languages,
and candidates ordered most severe first.

### Security (`src/lib/security/`)

- SSRF: metadata service, loopback, private, CGNAT, IPv6 unique/link-local,
  IPv4-mapped IPv6, non-HTTP schemes, credentials in URL, non-standard ports,
  redirect re-validation, wildcard-does-not-match-apex, empty allowlist denies.
- Redaction: sensitive keys at any depth, secrets in innocuously named fields,
  bounded recursion and array length, allowlisted log payloads that drop
  everything else.

### Localization (`src/lib/i18n/`)

- Zero missing or extra French keys, including array lengths.
- No empty strings or placeholder markers in either locale.
- No sentence-length English prose left in the French catalog.
- Interpolation placeholders consistent across locales.
- No prohibited marketing claims (PRD 4.4) in either locale.

### Database (`supabase/test/`)

27 assertions covering: cross-tenant reads by ID, draft report invisibility,
internal comment invisibility, internal-only tables (evaluations, audit events,
billing events), billing-only member restrictions, analyst and owner access
levels, anonymous sessions, released-report immutability and append-only audit
events.

## Mandatory E2E scenarios (PRD 20.2)

| # | Scenario | Covered by |
|---|---|---|
| 1 | Purchase Essential, activate, onboard, appears in queue | **Not covered** — needs billing + auth + UI |
| 2 | Purchase Pro, paired scenarios, release bilingual report | **Not covered** |
| 3 | Replay payment webhook, no duplicate | Unit (`webhook-processing.test.ts`) |
| 4 | Payment fails, entitlement not granted | Unit |
| 5 | Client A changes URL to Client B's project | Database (`rls_tenant_isolation.sql`) |
| 6 | Internal notes never reach the client | Database |
| 7 | Invalid/oversize upload rejected | **Not covered** |
| 8 | API adapter attempts private/metadata IP | Unit (`ssrf.test.ts`) |
| 9 | Malformed evaluator JSON, bounded retry | **Not covered** — needs AI provider |
| 10 | Critical candidate requires approval before alert | Unit (`findings.test.ts`) |
| 11 | Release fails with unreviewed high finding | Unit (`state-machine.test.ts`) |
| 12 | Released report immutable; correction is v2 | Unit + database trigger |
| 13 | Cancel subscription, access to period end | Unit (entitlement effect) |
| 14 | French locale has no missing keys or English draft text | Unit (`i18n.test.ts`) |
| 15 | Kill switch stops execution, reports stay accessible | Unit |

**10 of 15 covered at the unit or database level. Five need the missing
integrations and UI.** Where a scenario is covered by a unit test rather than a
browser test, the *rule* is verified but the *wiring* is not — that distinction
matters and is why these are not marked complete.

## Evaluation fixture suite (PRD 20.4)

**Not built.** Requires at least 60 synthetic cases: 15 strong, 15 clear
factual/policy failures, 10 escalation failures, 10 privacy/prompt-injection,
10 matched English/French — with expected score ranges, used to detect prompt
and model drift before any evaluator change.

This is a prerequisite for enabling AI evaluation at all, since PRD 15.6
requires a shadow comparison on a representative fixture set before switching
evaluator versions.

## Running everything

```bash
npm run verify     # format, lint, typecheck, unit tests, production build
npm run db:test    # migrations + RLS isolation suite on a throwaway cluster
```

`npm run db:test` must be run as a non-root user.

## Definition of done for a new feature

From PRD 20.5. A feature is not done until: the requirement and acceptance
criteria are mapped in PRD_TRACEABILITY.md; the UX exists in both English and
French; server-side authorization is included; validation, error, loading and
empty states are handled; the analytics event is emitted if one is specified;
automated tests pass; accessibility is checked; logs are safe; documentation is
updated; and the production feature-flag state is decided.
