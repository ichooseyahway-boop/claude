# Security

## Reporting a vulnerability

Email the address published on the Security and Privacy Practices page. Include steps to reproduce
and the affected URL or endpoint. Do not include customer data, credentials or transcripts in the
report — describe them instead.

We aim to acknowledge within two business days. We do not currently operate a paid bounty.

Please do not test against production without written authorization. The service's own Acceptable
Use policy applies to us too.

## Posture

BotAssure CX handles customer service policies, captured AI transcripts and audit findings. The data
classification (PRD 16.4) is:

| Class | Examples | Handling |
|---|---|---|
| Public | Marketing pages, methodology, synthetic sample report | No restriction |
| Internal | Scenario templates, operational metrics | Internal roles only |
| Confidential | Customer policies, reports, findings, ordinary transcripts | Tenant-scoped, RLS enforced |
| Restricted | Credentials, sensitive personal data, critical evidence, breach records | Stronger access control, redacted notification, enhanced audit logging |

## Controls implemented

**Tenant isolation.** Two independent layers, both required:

- Application: `src/domain/authz/permissions.ts` decides whether an actor may take an action,
  including re-authentication requirements that RLS cannot express.
- Database: Row Level Security on every table in `public`. `0006_governance_and_operations.sql`
  ends with an assertion that fails the migration if any table lacks RLS.

Grants are a third gate: `0007_grants.sql` revokes Supabase's permissive defaults and grants table by
table, so a new table is unreachable until someone decides who may read it.

Verified by 37 assertions in `supabase/test/01_tenant_isolation_test.sql` (`npm run db:test`),
covering cross-tenant reads by ID, unfiltered scans, internal-note leakage, billing-only access,
draft visibility and anonymous access.

**Immutability.** Enforced by database triggers, not by convention:

- `conversation_turns` — no UPDATE, no DELETE. A captured response is evidence.
- `audit_events` — no UPDATE, no DELETE, for anyone.
- `reports` — a released report's score, grade, snapshot and PDF cannot be rewritten; only
  supersession is permitted (FR-RPT-004).
- `finding_status_history` — append-only, written by trigger rather than by the caller.
- `authorization_attestations` — immutable except revocation.
- `scenario_templates` / `audit_plans` — frozen once published or approved.

**SSRF.** `src/lib/security/ssrf.ts` blocks non-HTTP schemes, non-web ports, embedded credentials,
loopback, link-local (including `169.254.169.254`), private ranges, CGNAT, multicast, IPv4-mapped
IPv6 forms, internal hostname suffixes and known metadata hostnames. Host allowlists narrow further.
Private addresses are blocked **even when allowlisted**, so an operator typo cannot open an internal
target. `assertSafeResolvedIps` covers the DNS-rebinding half and must be called by the fetch layer
after resolution — see ASSUMPTIONS.md A-04.

**Prompt injection.** `src/integrations/ai/prompt.ts` never concatenates untrusted content into the
system instruction. The tested system's response travels in a delimited data block with fence
sequences and leading role markers neutralized. The test suite asserts the system prompt is
byte-identical whether the response is benign or hostile.

**Secrets.** `connection_configs.secret_reference` accepts only a vault-reference pattern; the
database rejects a plaintext credential written to that column. `.env.example` carries names and
descriptions only. `.gitignore` excludes every `.env` variant except the example.

**Response headers.** CSP with a per-request nonce and `'strict-dynamic'` (no `'unsafe-inline'` for
scripts), HSTS with preload, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`frame-ancestors 'none'`, `Referrer-Policy`, a restrictive `Permissions-Policy`, and
COOP/CORP set to `same-origin`.

**Logging.** `redactForLog` drops values under sensitive keys, drops transcript-shaped keys the PRD
forbids logging, runs free-text redaction over remaining strings, and truncates depth, arrays and
long strings.

**Kill switch.** `EXECUTION_KILL_SWITCH` stops all new outbound test execution. It deliberately does
not block review, reporting or release — customers keep access to existing reports.

## Controls not yet implemented

Stated plainly so nobody assumes otherwise:

- Rate limiting and abuse detection
- Malware scanning of uploads
- Dependency and secret scanning in CI (no CI pipeline is configured)
- Authentication, session management and MFA enrolment
- Backup and restore testing
- Retention and deletion jobs

## Dependencies

Versions are pinned in `package.json` and locked in `package-lock.json`. Authentication, billing and
data-security dependencies must not be beta releases (PRD 1.1 rule 2).
