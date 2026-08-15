# Manual Delivery SOP — First Customers (Release 0)

This is the operator runbook for delivering a **Back-to-School Inbox Rescue**
by hand, using the data structures this application already stores. It mirrors
PRD §25. Release 0 is a **human-verified concierge service**: the software
handles discovery, payment, onboarding, and operational visibility; the
operator does the reading, verification, and delivery.

## Where to work

- Paid orders and onboarding status: **`/ops`** (gated by `OPS_ACCESS_TOKEN`).
- Each order shows the customer, offer, onboarding state, and children.

## Standard operating procedure

1. **Confirm payment and completed onboarding.** In `/ops`, the order shows
   `Ready for materials` once onboarding is complete. Do not begin work before
   payment is confirmed.
2. **Confirm scope.** Verify the expected number of children and schools against
   the plan (Rescue = up to 2 children / 2 schools / 30 source items). If the
   customer needs more, agree the additional-child add-on **before** charging.
3. **Restate boundaries.** Remind the customer, in your first message, not to
   send prohibited materials (medical, custody, legal, immigration,
   special-education, financial-account documents).
4. **Register every source** in the operating tracker as it arrives: sender,
   type, received date, attachment count.
5. **Extract candidates** for each source: events, actions, deadlines, links,
   costs, and requirements. Separate the *event time* from any *action
   deadline*.
6. **Verify every consequential field against the original source.** Pickups,
   payments, consent forms, and urgent/same-day changes must match the source
   text exactly. Quote the source excerpt for each.
7. **Mark ambiguity explicitly. Do not guess.** A vague phrase ("next
   Thursday", "coming soon") is held as *Clarification needed* and sent back to
   the customer for confirmation — never converted to a firm date.
8. **Detect duplicates and changes.** When a later message supersedes an earlier
   one, keep the previous value visible beside the new one; never silently
   overwrite.
9. **Build the deliverable:** a verified 60–90-day calendar and a prioritized
   action list, each item traceable to its source.
10. **Send the customer a review link / protected deliverable.**
11. **Apply corrections** and obtain the customer's acknowledgment.
12. **Schedule** the Sunday Week Ahead briefing and the 14-day follow-up
    reminders.
13. **Record handling metrics** (minutes per family, correction types, feedback)
    — **without copying any private content into analytics.** Only counts and
    categories.
14. **Delete raw sources** per the published retention policy once the rescue is
    delivered (default: 30 days after delivery, sooner on request).

## Verification checklist (per consequential item)

- [ ] Source excerpt captured and attached
- [ ] Date resolved using the source timestamp + family time zone
- [ ] Event time vs. action deadline separated
- [ ] Cost / link captured where present
- [ ] Assignee set (owner, co-parent, or caregiver)
- [ ] Ambiguity flagged rather than guessed
- [ ] Supersede relationship recorded if this replaces a prior item

## Non-negotiables

- Never sign a form, grant consent, pay a school, or message a teacher on the
  customer's behalf.
- Never publish a consequential item without a source reference.
- Never place child names, school names, action titles, or private URLs into
  analytics or logs.
