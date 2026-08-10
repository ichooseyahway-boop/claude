# Incident response

Derived from PRD 16.8 and 21.5. This is an operating procedure, not legal advice. A qualified
Canadian privacy lawyer must review it before launch, and no step here automates a legal
notification decision.

## Priority order (PRD 21.5)

1. Protect people and data.
2. Stop unsafe processing with feature flags and kill switches.
3. Preserve evidence.
4. Assess scope and legal notification needs.
5. Restore safe service.
6. Communicate accurately.
7. Complete a post-incident review and corrective actions.

Note the order: containment comes before diagnosis, and communication comes after assessment. Telling
a customer the wrong scope is worse than telling them slightly later.

## Roles

| Role | Responsibility |
|---|---|
| Owner | Declares the incident, owns customer and regulator communication, approves notification |
| Technical contact | Containment, evidence preservation, remediation |
| Legal/privacy contact | Notification obligations, regulator liaison, Law 25 assessment |

For a single-operator business the owner holds all three until staff exist. Legal and privacy
questions go to external counsel — not to the owner's own judgement.

## Severity

| Level | Definition | Response |
|---|---|---|
| SEV1 | Confirmed or credible unauthorized access to customer data; cross-tenant exposure; credential compromise | Immediate. Kill switch on. Counsel engaged same day. |
| SEV2 | Service unavailable, billing incorrect, or a released report contains data it should not | Same business day |
| SEV3 | Degraded function with a workaround | Next business day |
| SEV4 | Cosmetic or low-impact | Normal backlog |

Any suspected cross-tenant exposure is SEV1 until proven otherwise. PRD 26.3 targets zero known
cross-tenant exposure, so there is no "probably fine" version of that finding.

## Immediate containment

```
# 1. Stop all outbound test execution (reports stay readable, billing keeps working)
EXECUTION_KILL_SWITCH=true

# 2. Disable higher-risk modules
FLAG_BROWSER_RUNNER=false
FLAG_REPORT_SHARE_LINKS=false
```

For credential compromise, rotate in this order and record each rotation:
`SUPABASE_SERVICE_ROLE_KEY` → `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` → `AI_PROVIDER_API_KEY`
→ `EMAIL_API_KEY` → `JOB_SIGNING_SECRET`. Revoke affected sessions after rotating.

## Evidence preservation

`audit_events` and `conversation_turns` cannot be updated or deleted, so the record survives the
incident by construction. Before remediating:

- Export the relevant `audit_events` range.
- Note the deployment SHA and the time window.
- Do not delete logs or rows to "clean up". Preserve first.

Preserve without broadening exposure: evidence goes to the incident record, not to a shared channel.

## Breach register

Maintain a register entry for **every** incident involving personal information, including those
below reporting thresholds (PRD 16.8). Record: detection time and method, data categories, number of
individuals if known, containment actions, assessment of real risk of significant harm, the
notification decision **and who made it**, and remediation.

The register exists so a pattern of small incidents is visible before it becomes a large one.

## Notification

Do not automate this decision. Under PIPEDA, breaches posing a real risk of significant harm require
notification to the Privacy Commissioner and affected individuals as soon as feasible; Quebec Law 25
carries its own obligations where Quebec organizations or individuals are involved. Counsel decides.
The register records the decision and its author either way.

Customer notification for a SEV1 says what happened, what data was involved, what has been done, and
what the customer should do. It does not speculate about cause before the assessment is complete.

## Post-incident review

Within five business days of resolution: timeline, root cause, why detection took as long as it did,
corrective actions with owners and dates, and whether a control that should have caught it exists but
did not fire. Add a regression test for the specific failure.
