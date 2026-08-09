# Incident Response

PRD refs: 16.8 (breach readiness), 21.5 (incident runbook priorities),
Appendix D.

> **Notification decisions are never automated.** No script, alert or dashboard
> in this system decides whether a regulator or a customer must be notified. A
> person makes that decision, with qualified advice (PRD 16.8).

## Priorities, in order

1. Protect people and data.
2. Stop unsafe processing using the feature flags and kill switch.
3. Preserve evidence.
4. Assess scope and legal notification needs.
5. Restore safe service.
6. Communicate accurately.
7. Complete a post-incident review and corrective actions.

Never reorder these. Restoring service before preserving evidence destroys the
record of what happened.

## Roles

| Role | Responsibility |
|---|---|
| **Incident owner** | The business owner by default. Decides, communicates, and is accountable. |
| **Technical contact** | Investigates, contains, restores. May be a contractor. |
| **Privacy/legal contact** | Advises on notification obligations. External counsel until one is retained. |

Fill in real names and contact details before launch. An incident is the wrong
time to work out who to call.

## Severity

| Level | Definition | Response |
|---|---|---|
| **SEV1** | Confirmed or credible unauthorized access to customer data; sensitive data exposure; data loss without backup | Immediate. Owner leads. Kill switch considered within minutes. |
| **SEV2** | Service unavailable, billing incorrect, reports inaccessible, or a security control confirmed ineffective | Same business day. |
| **SEV3** | Degraded performance, a failing non-critical job, a single customer affected with a workaround | Next business day. |
| **SEV4** | Cosmetic or low-impact defect | Normal backlog. |

When in doubt, start one level higher and downgrade with evidence.

## Immediate containment

### Stop outbound testing

Set `EXECUTION_KILL_SWITCH=true` and redeploy, or flip the equivalent
`feature_flags` row. This stops new outbound test execution. It deliberately
does **not** disable report access, sign-in or billing administration, so
containment does not become a customer-facing outage (FR-RUN-004).

### Disable a specific capability

Set the relevant `FEATURE_*` variable to `false`. Flags default off, so removing
the variable also disables the feature.

### Revoke credentials

1. Revoke the affected customer test credential through the secret store and set
   `connection_configs.status = 'revoked'`.
2. Rotate any exposed platform secret at the vendor, then update the deployment
   platform's secret manager. Rotate the database service-role key, billing
   secret and webhook signing secret, email API key and AI provider key as
   applicable.
3. Rotating a webhook signing secret will reject in-flight webhooks. Expect the
   provider to retry; verify afterwards that no event was permanently lost.

### Suspend an account

Set `organizations.status = 'suspended'` or revoke the specific membership.
Membership revocation takes effect immediately because RLS reads it on every
query.

## Preserving evidence

- Do **not** delete rows, drop tables or clear logs during an incident.
- `audit_events` and `finding_status_history` are append-only by trigger; leave
  them that way.
- Captured conversation content and released reports are immutable by trigger.
  If a correction is needed later, it is a new report version.
- Export the relevant `audit_events` range and correlation IDs to the incident
  record before any remediation that changes state.
- Keep evidence access narrow. Preserving it does not mean circulating it.

## Assessing scope

Answer, in writing:

1. What data was involved, in which classification (see PRIVACY_DATA_MAP.md)?
2. Which organizations are affected? Cross-tenant exposure is SEV1 regardless of
   volume.
3. Over what time window?
4. Was the data Restricted (credentials, sensitive personal data, critical
   evidence)?
5. Is there evidence of exfiltration, or only of access?
6. Is the vector still open?

## Breach register

Maintain a register **even for incidents below reporting thresholds** (16.8).
Each entry:

- Incident ID, date detected, date occurred (if known).
- Severity and current status.
- Data categories and organizations involved.
- Containment actions and timestamps.
- Notification decision, who made it, on what advice, and when.
- Root cause and corrective actions.
- Post-incident review date.

Store it outside the affected production system.

## Notification

Notification obligations under PIPEDA, Quebec Law 25 and any contractual terms
depend on facts this document cannot anticipate. The procedure is:

1. Assemble the scope assessment above.
2. Consult the privacy/legal contact.
3. Record the decision and its basis in the breach register.
4. If notifying customers, use a sanitized notice. Do not put detailed sensitive
   evidence in an email — the same rule that governs critical findings
   (FR-FND-003, FR-NOT-002).
5. Notify the regulator if advised, within the applicable timeframe.

Prepare the regulator and customer notification decision worksheets before
launch, not during an incident.

## Critical finding discovered during an audit

This is a specific, expected case (Appendix D):

1. Restrict access to the evidence.
2. Senior review of the candidate. It is a candidate until a human confirms it.
3. Notify the owner and assigned analyst with a **restricted alert containing no
   evidence text**.
4. Decide whether to send a sanitized customer notice. Record the time and
   recipient.
5. Support containment without offering legal advice or a compliance opinion.

## Stop conditions during testing (16.9)

Stop immediately, escalate to the owner, and preserve minimal evidence when:

- authorization is revoked or has expired;
- the target moves outside the allowlisted scope;
- the system returns real restricted personal data unexpectedly;
- rate limits or system distress indicate harm to the customer's system;
- a credible critical vulnerability appears outside the agreed CX scope;
- the client requests a prohibited action.

## Provider outage

1. Update the status page and say what is actually known.
2. Pause affected jobs; preserve the queue rather than draining it.
3. Use manual fallback where it is safe — an AI provider outage routes
   evaluation to analyst review and must never block access to existing reports
   (15.6, 18.2).
4. Communicate a target without making an unsupported promise.

## Post-incident review

Within five business days of resolution, for SEV1 and SEV2:

- Timeline from first signal to resolution.
- What detected it, and what should have.
- What worked and what did not.
- Corrective actions with owners and dates.
- Whether a control in SECURITY.md needs to change, or a new test is needed to
  stop a recurrence.

Blameless. The point is a system that fails less, not a person to hold
responsible.
