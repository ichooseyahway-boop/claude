# Test plan

Required by PRD 1.2. Maps PRD 20.1's required test layers to what exists, and states plainly what
does not.

## Current state

| Suite | Command | Count | Status |
|---|---|---|---|
| Unit (domain + security + i18n + prompt) | `npm test` | 301 | Passing |
| Database constraints and RLS | `npm run db:test` | 37 assertions | Passing |
| Integration | — | 0 | Not built |
| End-to-end | — | 0 | Not built |
| Accessibility (automated) | — | 0 | Not built |
| Visual regression | — | 0 | Not built |
| Load | — | 0 | Not built |

## Layer coverage (PRD 20.1)

**Unit tests for scoring, state machines, entitlements, redaction and permission helpers** — ✅
complete.

- `score.test.ts` — weighted scoring, N/A exclusion, unscorable handling, grade boundaries, all
  three cap rules, cap-never-raises, owner exception.
- `parity.test.ts` — gap formula, four bands, ten-pair minimum, discarded pairs, risk weighting,
  direction-agnostic gaps.
- `state-machine.test.ts` — full graph, terminal states, released→superseded only, kill switch
  scope, fail-closed on absent context.
- `entitlements.test.ts` — reference packages against PRD 6.1–6.4, overage arithmetic, hard
  ceiling, locale entitlement, tampered-blob rejection.
- `permissions.test.ts` — full role matrix, cross-tenant denial, indistinguishable denials,
  project scoping, re-authentication.
- `redaction.test.ts` — Luhn and SIN checksums, detection, redaction, release blockers, log
  redaction.
- `ssrf.test.ts` — IPv4/IPv6 classification, scheme, port, credentials, allowlists, resolved IPs.
- `schema.test.ts` — evaluator schema, evidence spans, retry budget, injected-instruction handling.
- `deterministic-checks.test.ts` — all eleven checks, ordering, candidate-not-finding contract.
- `library.test.ts` — scenario structure, category coverage, synthetic-data policy.
- `severity.test.ts` — severity ordering, the PRD 10.8 low-confidence-critical block, FR-EVAL-005 confirmation routing.
- `i18n.test.ts` — key parity, no English in French, no placeholders, prohibited claims,
  negotiation, formatting.
- `prompt.test.ts` — system prompt constant under hostile input, fence balancing, PRD 15.3 clauses.

**Database tests for constraints and RLS** — ✅ complete for the claims in PRD 16.2.

`supabase/test/01_tenant_isolation_test.sql` proves each of PRD 16.2's required assertions that live
in the database, plus immutability triggers and the check constraints behind PRD 10.8 and FR-FND-004.
`npm run db:test` applies every migration to a throwaway database first, so it also proves the
migrations apply cleanly in order.

**Integration tests for authentication, billing webhooks, storage, email and AI structured output** —
⬜ not built. Blocked on the adapters existing.

**End-to-end tests** — ⬜ not built. Blocked on authentication and the application surfaces.

## PRD 20.2 mandatory E2E scenarios

None run as E2E. Several have a testable domain core that is covered; that is not the same as the
scenario passing, and is recorded here so the distinction is not lost.

| # | Scenario | E2E | Domain core covered |
|---|---|---|---|
| 1 | Purchase Essential, activate, onboard, appear in ops queue | ⬜ | Entitlements ✅ |
| 2 | Purchase Bilingual Pro, paired scenarios, release bilingual report | ⬜ | Parity ✅, release gate ✅ |
| 3 | Replay payment webhook, no duplicate | ⬜ | Unique constraint ✅ |
| 4 | Payment fails, entitlement not granted | ⬜ | — |
| 5 | Client A requests Client B's project, denied + security event | ⬜ | RLS ✅, `authorize()` ✅ |
| 6 | Internal notes never reach the client | ⬜ | RLS ✅, permission matrix ✅ |
| 7 | Invalid/oversize upload rejected | ⬜ | Type/size bound in the storage interface |
| 8 | API adapter rejects private/metadata IP | ⬜ | SSRF guard ✅ |
| 9 | Malformed evaluator JSON, bounded retry then manual review | ⬜ | ✅ |
| 10 | Critical candidate requires human approval before alert | ⬜ | Confirmation rules ✅ |
| 11 | Release blocked with an unreviewed high finding | ⬜ | State machine ✅ |
| 12 | Released report immutable, correction is v2 | ⬜ | Triggers ✅ |
| 13 | Cancellation keeps access through the paid period | ⬜ | — |
| 14 | French locale has no missing keys or English draft text | ⬜ | ✅ (unit) |
| 15 | Kill switch stops execution, reports stay readable | ⬜ | ✅ |

## PRD 20.3 security release tests

| Check | Status |
|---|---|
| RLS enabled on every exposed tenant table | ✅ asserted by migration and by the test suite |
| Cross-tenant suite passes | ✅ |
| No unresolved critical dependency vulnerability | ⬜ no CI audit step |
| Secret scan | ⬜ not configured |
| Security headers | 🟨 defined and unit-addressable; no automated inspection |
| Webhook signature rejection | ⬜ blocked on the adapter |
| Short-lived download authorization | 🟨 required by the interface; no adapter |
| Logs contain no secrets or transcripts | 🟨 `redactForLog` tested; no end-to-end log assertion |

## PRD 20.4 evaluation fixture suite

⬜ Not built. PRD 20.4 requires at least 60 synthetic cases (15 strong, 15 policy failures, 10
escalation failures, 10 privacy/injection, 10 matched bilingual) with expected score ranges, used to
detect prompt and model drift before an evaluator change.

The scenario library provides the situations; the fixtures need captured responses and expected
ranges attached, which requires a provider adapter to generate against.

## Coverage thresholds

`vitest.config.mts` enforces 85% statements/lines/functions and 80% branches on `src/domain/**` and
`src/lib/security/**` — the code where a defect changes a customer's score or leaks their data.
Coverage is deliberately not enforced repository-wide; a percentage on presentational components
would measure effort rather than risk.

## Running everything

```bash
npm run verify      # format, lint, typecheck, unit tests, production build
npm run db:test     # migrations + RLS suite (needs PostgreSQL)
```
