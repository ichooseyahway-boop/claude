# Owner runbook

Required by PRD 1.1 rule 9. Written for a non-technical owner.

> **Read this first.** Most procedures below describe interfaces that **do not exist yet** — there is
> no customer portal, no analyst workspace and no billing integration in this repository. They are
> written now, from PRD Appendix D, so the operating model is settled before the software is built,
> and so nobody has to invent a refund policy under pressure. Each section marks what is available
> today.

## Daily rhythm

Once the operations dashboard exists, check each morning: new paid orders, onboarding blockers,
projects at risk of missing target, releases awaiting approval, failed payments, critical restricted
alerts, dead-letter jobs, privacy requests, provider cost alerts.

**Today:** none of this exists. Nothing is running that requires monitoring.

## New order

*Not yet available.*

1. Confirm payment cleared. Never begin work on an unpaid order — PRD 6.5 makes payment a
   precondition, and the turnaround clock does not start until onboarding is accepted.
2. Check onboarding status. If the customer has not completed it, the delay is theirs; the SLA clock
   pauses only while a documented customer-blocked reason is recorded.
3. Assign an analyst.
4. Confirm the target date.

## Onboarding review

*Not yet available.*

Accept, request changes, or decline. Decline for: unauthorized target, high-risk regulated use,
prohibited data, unsafe instructions, unavailable access, or a service mismatch (FR-ONB-003).

The customer sees a professional explanation. Internal notes stay internal — they are a separate
database column and the customer-facing queries never select them.

Do not accept a project where the customer cannot demonstrate authority to authorize the test. This
is the single most important gate in the business.

## Unsafe scope

*Procedure available; tooling not.*

1. Pause the project.
2. Preserve minimal evidence — do not delete anything.
3. Request clarification in writing.
4. If unresolved, decline and refund according to the published policy.

Stop testing immediately when (PRD 16.9): authorization is revoked or expired; the target moves
outside the allowlisted scope; the system returns real restricted personal data unexpectedly; rate
limits or system distress appear; a credible critical vulnerability appears outside the agreed CX
scope; or the client requests a prohibited action.

## Critical finding

*Procedure available; tooling not.*

1. Restrict the evidence.
2. Get senior review before anything goes to the customer.
3. Decide on a **sanitized** customer alert. Detailed critical evidence must never go out by email
   (FR-FND-003) — the customer is linked to the portal.
4. Record notification time and recipient.
5. Support containment. Do not offer legal advice or characterize regulatory obligations.

A low-confidence finding cannot be recorded as Critical without senior confirmation. The database
refuses it, so this is not a matter of remembering.

## Report release

*Procedure available; tooling not.*

Work through PRD Appendix C before approving. The gate blocks release until every P0 scenario is
reviewed and every critical/high candidate is adjudicated, and the automated scanner refuses a report
containing a credential or unredacted restricted value.

Neither replaces reading the report. Release requires re-authentication — this is deliberate, not a
glitch.

Once released, a report is immutable. A correction becomes version 2 with a stated reason; version 1
stays accessible and marked superseded.

## Refund

*Not yet available.*

1. Confirm the order and how much work has been done.
2. Apply the published policy. Before onboarding is complete and before analyst work has begun, a
   refund is straightforward. Once testing has begun it is discretionary and governed by the
   published policy (PRD 6.5).
3. Execute through the billing provider.
4. Confirm the entitlement updated.
5. Record the reason. Refunds require re-authentication and are audited.

## Data deletion

*Not yet available — the deletion job is not built.*

1. Verify identity and authority.
2. Check for legal or contractual holds. Billing records are not deleted through the account UI.
3. Export first if the customer asked for it.
4. Run the deletion workflow.
5. Verify completion — record that it completed without retaining what was deleted.
6. Notify the customer.

## Provider outage

*Procedure available.*

1. Update the status page, distinguishing application, billing, email and processing issues.
2. Pause affected jobs. Preserve the queue; do not drain it.
3. Use manual capture as a fallback where safe.
4. Communicate a target without promising a time you cannot support.

Existing released reports stay readable when the AI provider is down (PRD 18.2). If they do not,
that is a defect, not expected behaviour.

## Emergency shutdown

*Available today as configuration.*

```
EXECUTION_KILL_SWITCH=true
```

Stops all new outbound test execution. Reports remain accessible and billing administration keeps
working — the switch is deliberately scoped so a security response does not lock customers out of
work they have paid for.

## Credential rotation

*Available today.*

Rotate in the deployment platform's secret manager, never in a file. Order:
`SUPABASE_SERVICE_ROLE_KEY` → `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` → `AI_PROVIDER_API_KEY`
→ `EMAIL_API_KEY` → `JOB_SIGNING_SECRET`. Revoke active sessions afterwards. Rotate after any
suspected exposure and whenever someone with access leaves.

## Things never to do

- Never begin testing without a current, unexpired, unrevoked authorization attestation.
- Never email detailed critical evidence, transcripts or credentials.
- Never edit a captured response. The database refuses it; if you find a way, report it as a defect.
- Never claim a report is a certification, a legal opinion, a security audit or proof of compliance.
- Never publish a customer result, even anonymized, without separate written permission.
- Never hand-edit production data to fix a workflow problem. Fix the workflow.
