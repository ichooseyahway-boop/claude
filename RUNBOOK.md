# Owner Runbook

Operating procedures for the business owner, written to be usable without a
developer. PRD refs: 1.1.9, Appendix D, 24.5.

> **Current limitation.** The client portal and operations workspace are not
> built yet. Several procedures below say "not available in the application" and
> give the manual alternative. PRD section 28 rejects a handoff where "the owner
> requires code edits for routine orders, assignments, reports or refunds" —
> that condition currently applies, and closing it is the largest remaining
> piece of work. See PRD_TRACEABILITY.md.

## Everyday vocabulary

| Term | Meaning |
|---|---|
| **Organization** | One customer company. All their data lives inside it and cannot leak to another. |
| **Project** | One engagement for one AI system. |
| **Run** | One execution of a set of scenarios. |
| **Case** | One scenario in one language. |
| **Finding** | A defect or observation a human has approved. |
| **Release** | The moment a report becomes visible to the customer. Irreversible. |

## New paid order

**Target: verify payment → check onboarding → assign an analyst → watch the
date.**

1. Confirm the payment succeeded in the billing provider's dashboard. Never
   start work on a payment you have not seen there.
2. Confirm exactly one order and one project were created. If you see two, stop
   and investigate before doing anything else — duplicate provisioning is a
   billing problem, not a data problem.
3. Check the onboarding checklist status. The five-business-day clock does
   **not** start until onboarding is complete and accepted.
4. Assign an analyst.
5. Note the target date. If you are waiting on the customer, the clock pauses
   and the customer should be able to see that.

*Not available in the application yet: order and assignment screens. Until then,
track in the database or a spreadsheet and record the assignment in the project
record.*

## Reviewing scope

Before any testing:

1. Is there a current authorization attestation from someone with authority to
   give it?
2. Are the target hosts listed and authorized?
3. Are the authoritative policies supplied?
4. Is the request inside what we can competently and safely assess?

Decline — and say why, plainly — if the customer has no authority to authorize
testing, wants personal information obtained or exposed, expects a legal
certification, operates a high-risk regulated decision system outside our
expertise, refuses to supply authoritative policies but wants factual
certification, has an abusive or deceptive purpose, or has a deadline
incompatible with safe review (PRD 24.3).

Internal notes about a declined engagement stay internal. The customer gets a
professional explanation.

## Unsafe scope discovered mid-engagement

1. Pause the project.
2. Preserve minimal evidence.
3. Request clarification from the customer.
4. If unresolved, decline and refund according to the published policy.

If testing must stop immediately, see INCIDENT_RESPONSE.md → "Stop conditions".

## Critical finding

1. Restrict access to the evidence.
2. Get a senior review. A critical candidate is not a finding until a human
   confirms it.
3. Decide on a **sanitized** customer notice. The system will not email detailed
   sensitive evidence, and neither should you.
4. Record when you notified whom.
5. Support containment. Do not offer a legal opinion or a compliance verdict.

## Releasing a report

Run the checklist in `RELEASE_CHECKLIST.md` → "Report release". The system
blocks release unless:

- every required scenario has been reviewed;
- every critical and high candidate has been adjudicated by a human;
- scope and limitations text is complete;
- a preview has been generated;
- no internal notes appear in customer-visible content;
- no secrets or unredacted restricted data are detected;
- a named authorized reviewer approved it;
- authorization was active for every test in the run.

If the system blocks a release, the answer is to fix the underlying condition —
never to work around the gate.

A released report is immutable. A correction is a **new version** with the
correction reason recorded. The old version stays accessible and is marked
superseded.

## Refunds

1. Confirm the order and how much work has actually been done.
2. Apply the published policy: full refund if onboarding is incomplete and no
   analyst work has begun; discretionary once testing has started; full refund
   if we declined the engagement after purchase.
3. Execute the refund through the billing provider.
4. Confirm the entitlement updated.
5. Record the reason.

*Not available in the application yet: the refund action. Issue it in the
provider's dashboard and record the reason against the order.*

## Data deletion request

1. Verify identity and authority. Do not act on an unverified email.
2. Identify any legal or contractual holds — billing records in particular are
   usually retained for accounting and tax reasons.
3. Offer an export first if the customer wants their data.
4. Run the deletion.
5. Verify completion without retaining a copy of what was deleted.
6. Tell the customer what was deleted and what was retained, and why.

*Not available in the application yet: the deletion workflow. Handle manually
and record it in `privacy_requests`.*

## Subscription payment failed

The entitlement suspends after the provider's retry window. Access to
already-released reports is preserved deliberately — a failed payment should
not take away a report the customer already paid for. Contact the customer
before cancelling anything.

## Provider outage

1. Update the status page with what is actually known.
2. Pause affected jobs; preserve the queue.
3. Use manual fallback where safe. An AI provider outage means analysts score
   manually — it must never block access to existing reports.
4. Give a target without promising something you cannot control.

## Stopping everything

Set `EXECUTION_KILL_SWITCH=true` in the deployment platform and redeploy. This
stops new outbound testing. Customers keep their reports, sign-in works, and
billing administration continues.

Use it when: a customer's system is under distress, an authorization turns out
to be invalid, or you suspect the testing pipeline is misbehaving.

## Monthly

- Reconcile revenue, refunds and provider fees.
- Review analyst minutes and AI cost per audit against the target delivery cost
  (below 25% of net revenue).
- Check the dead-letter queue and failed webhooks.
- Review open privacy and support requests.
- Check that no vendor account is unintentionally still in test mode.

## Quarterly

- Restore a database backup into a non-production environment and confirm it
  works. An untested backup is not a backup.
- Review the subprocessor register.
- Review the scenario library: what did customers actually challenge, and what
  should be added?
- Review reviewer calibration — where do two reviewers disagree?

## Annually

- Legal review of terms, privacy, acceptable use and refund policy.
- Insurance review.
- Reassess retention defaults.

## When to call a developer

- Any suspected cross-tenant data exposure. Do not investigate alone.
- A release gate blocking for a reason you cannot explain.
- Duplicate orders from one payment.
- A webhook backlog that does not clear.
- Anything in INCIDENT_RESPONSE.md at SEV1 or SEV2.
