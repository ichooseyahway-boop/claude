# Security

## Reporting a vulnerability

Email the security address configured in `NEXT_PUBLIC_SECURITY_EMAIL` with
enough detail to reproduce the issue. We will confirm receipt and tell you what
we are doing about it. Please do not open a public issue for a security report.

Do not include customer data, credentials or live exploit payloads in the
report body.

## Scope of this document

Controls implemented in this repository, and the ones that are not yet. PRD
refs are to the BotAssure CX PRD v1.0, section 16.

**This is not a certification claim.** No accreditation body has assessed this
system, and the product must never be described as certified (PRD 4.4).

---

## Implemented

### Tenant isolation (16.1, 16.2)

- Every tenant-owned table carries `organization_id` and has row-level security
  enabled.
- The RLS migration ends with an assertion that fails if any table in `public`
  lacks RLS, so a new table cannot ship without a policy decision.
- `FORCE ROW LEVEL SECURITY` is set on the highest-consequence tables, so even
  the table owner is subject to policy.
- Policy helper functions are `SECURITY DEFINER` with a pinned `search_path`,
  which prevents a shadowed function or table from subverting a policy.
- 27 assertions in `supabase/test/rls_tenant_isolation.sql` verify that a client
  cannot read another organization's data by ID, that draft reports and internal
  notes are invisible to clients, that a billing-only member cannot reach audit
  content, and that an anonymous session sees nothing.

### Internal-only data

Not readable by any client role at the database level: AI evaluation proposals,
evaluator versions, scenario templates, billing provider events, the audit event
log, and internal comments.

### Server-side request forgery (FR-RUN-003)

`src/lib/security/ssrf.ts` refuses, before any request is made:

- hosts not on the project's authorization allowlist (allowlist-first, so an
  unauthorized public host is refused too);
- loopback, link-local (including `169.254.169.254`), private, CGNAT, multicast
  and unspecified addresses, in IPv4, IPv6 and IPv4-mapped IPv6 forms;
- non-HTTP schemes, non-standard ports, and credentials embedded in the URL;
- redirect targets, re-checked against the same policy.

Outbound requests are bounded by timeout, response size, redirect count, and
retry only on idempotent methods.

**Known gap.** DNS rebinding requires a connect-time address check in the HTTP
client. `isBlockedIpAddress` is exported for that purpose; the client is not
built yet.

### Secret handling (FR-ONB-005)

- Customer secrets are stored as opaque references, never inline. A CHECK
  constraint on `connection_configs.secret_reference` rejects anything that
  looks like a raw credential.
- `maskSecret` masks values for display after submission.
- `safeLogPayload` is an **allowlist**: only known-safe identifier fields reach
  a log line, and anything else is dropped rather than redacted. A new field
  cannot leak by default.
- `redactObject` redacts by key pattern and by value shape, so a secret in an
  innocuously named field is still caught.
- `scanForLeakedSecrets` backs the report release gate.

### Transport and browser controls

`next.config.ts` sets Content-Security-Policy (no `unsafe-inline` for scripts,
`frame-ancestors 'none'`, `object-src 'none'`), HSTS with preload,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`, and `noindex`/`no-store` on `/app` and `/ops`.

### Immutability (12.7)

Database triggers reject modification of captured conversation content and of
released report content, and make `audit_events` and `finding_status_history`
append-only. A correction is a new report version, never an edit.

### Release gate (FR-RPT-003)

`evaluateReleaseGate` blocks release on nine conditions, including unreviewed
critical/high findings, internal notes visible in customer content, detected
secrets, an unauthorized reviewer, and authorization not active for every test.

### Abuse controls

Rate limiting on the public contact form and sign-in requests; a honeypot field
whose success response is indistinguishable from a real one; credential-shaped
content rejected at the form boundary.

### Fail-closed defaults

Feature flags default off. Unconfigured providers return `NOT_CONFIGURED` —
there are no mock implementations that return success.

---

## Not yet implemented

These are real gaps, not oversights.

| Control | Status |
|---|---|
| Authentication, session rotation, MFA enforcement | Blocked on the auth provider |
| Malware scanning of uploads | `knowledge_sources.scan_status` exists; no scanner |
| Dependency and secret scanning in CI | No CI workflow (see ASSUMPTIONS.md A-024) |
| Distributed rate limiting | In-memory only (A-009) |
| Backups and tested restore | Blocked on a provisioned database |
| Automated accessibility and E2E security tests | Not written |
| Penetration test | Not commissioned |
| Connect-time DNS rebinding check | See above |

## Reviewing a change

- Does it add a table? It needs an RLS policy, or the migration assertion fails.
- Does it add a log or analytics call? Use `safeLogPayload`; do not pass raw
  objects.
- Does it make an outbound request on a customer's behalf? It must go through
  `checkOutboundUrl` with the project's authorized hosts.
- Does it render customer-visible content? It must not read `internal_notes`.
- Does it add a provider? It goes behind a contract in
  `src/integrations/contracts.ts`, not a direct SDK call from domain code.
