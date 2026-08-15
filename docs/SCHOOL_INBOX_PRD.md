# SCHOOL INBOX — Product Requirements Document and Claude Code Build Guide

Document version: 1.0
Prepared: August 14, 2026
Product stage: Validation and Concierge MVP
Primary launch market: English-speaking parents in Canada and the United States
Build target: Responsive web application, secure family portal, and internal operations console
Recommended launch model: Human-verified service first; assisted automation second

> This file is the source of truth for the build. It reproduces the product
> requirements verbatim. The implementation in this repository targets
> **Release 0 (Concierge MVP)** only. See [`../PRD_TRACEABILITY.md`](../PRD_TRACEABILITY.md)
> for a requirement-by-requirement status map, and [`../README.md`](../README.md)
> for how to run it.

## 1. Executive decision

School Inbox will not launch as another inexpensive AI family-calendar
application. It launches as a **premium, human-verified school-administration
service**:

> Forward the school emails, newsletters, screenshots, schedules, and flyers.
> School Inbox turns them into a verified family calendar, prioritized action
> list, and reminders — so nothing important quietly disappears.

The initial product is a **Back-to-School Inbox Rescue**, a one-time service for
**$149**. The recurring expansion is **School Inbox Care** at **$79/month**.
Customers pay for correct setup, verification, and continued action tracking —
not merely an AI-generated summary.

### Release strategy

| Release | Commercial objective | Customer experience | Technology level |
|---|---|---|---|
| Release 0: Concierge launch | Accept payment this week | Purchase, onboard, forward materials, receive a verified rescue | Marketing site, checkout, onboarding, manual operations |
| Release 1: Assisted portal | Improve retention, reduce delivery time | Private dashboard, actions, calendar, uploads, status | Auth, database, file storage, customer portal |
| Release 2: Inbound automation | Reduce handling cost | Unique forwarding address, automatic extraction, human review | Inbound webhook, OCR, structured AI extraction, review queue |
| Release 3: Scaled product | Support hundreds of families | Automated digests, conflict detection, co-parent workflows | Job queue, observability, permissions, analytics |

**Critical build rule:** Release 0 must complete before Release 1. Release 1 must
be stable before Release 2. The project must remain deployable at the end of
every release.

## 2. Market position (summary)

Parents receive school information through email, portals, PDFs, group chats,
screenshots, and paper. Important commitments — early dismissals, permission
forms, payments, registration cutoffs, picture days, special clothing, packed
lunches, transportation changes, teacher meetings, volunteer requests — are
buried. The parent is not asking for a better inbox; they are asking for
confidence that the right action happens at the right time.

School Inbox differentiates through: human verification of consequential
information; done-for-you onboarding; an action-completion model (not a passive
archive); clear source traceability for every extracted item; premium support;
and a narrow promise focused on school, camp, and child-activity administration.

**Positioning:** For working parents and caregivers managing multiple school-age
children, School Inbox is a human-verified school administration service that
turns scattered communications into a reliable family action plan.

**Preferred category terms:** school administration concierge; school inbox
rescue; family school-operations service; human-verified school planning.
**Avoid leading with:** AI family assistant; AI calendar; productivity
application; email summarizer. AI is an internal capability, not the
customer-facing value proposition.

## 3. Product principles

1. **Action over information.** Every source becomes an event, action,
   reference, or explicit "no action required" record.
2. **Trust over speed.** Important dates and responsibilities are reviewed before
   publication.
3. **Sources remain visible.** Every extracted item links back to its origin.
4. **Ambiguity is never disguised.** Missing or conflicting information is
   flagged for confirmation.
5. **The parent stays in control.** School Inbox never signs forms, grants
   consent, pays money, or sends messages without explicit authorization.
6. **Minimal access.** The MVP processes only what the customer forwards or
   uploads.
7. **Quiet interface.** The product reduces noise instead of creating another
   notification stream.
8. **No fake proof.** No fabricated testimonials, customer counts, ratings,
   logos, or time-saved statistics.

## 4. Goals and success measures

**North-star:** verified commitments handled per active family per month.

**Guardrails:** consequential published-item accuracy 99% after review; items
without a source reference 0%; high-risk items auto-published without review 0%;
median onboarding completion under 10 minutes; customer deletion requests
completed within the published policy period.

## 6. Offers and pricing

- **Back-to-School Inbox Rescue** — $149 one time. Up to two children, two
  schools, 30 submitted source items. Delivered 24–48 business hours after
  receipt of all materials. Additional child/school: proposed $25 per rescue
  (must be configurable, not hard-coded).
- **School Inbox Care** — proposed $79/month. Up to two children, 20 source
  items/week.
- **School Inbox Care Plus** — proposed $149/month. Up to four children, higher
  allowance, activities, priority review.

Pricing is a hypothesis. The application must load offer names, limits, and
prices from configuration or Stripe product metadata.

## 8. Information architecture

**Public routes:** `/`, `/how-it-works`, `/sample-briefing`, `/pricing`,
`/security`, `/faq`, `/get-started`, `/sign-in`, `/privacy`, `/terms`.

**Customer portal (Release 1+):** `/app`, `/app/week`, `/app/actions`,
`/app/calendar`, `/app/inbox`, `/app/upload`, `/app/family`, `/app/settings`.

**Internal operations (Release 0 minimal, expanded later):** `/ops`,
`/ops/review`, `/ops/families`, `/ops/sources/[id]`, `/ops/items/[id]`,
`/ops/digests`, `/ops/billing`, `/ops/audit`. Internal routes require an explicit
operator role and must never rely only on hidden navigation.

## 9.1 Brand direction

Calm, premium, human, trustworthy — closer to a high-end concierge service than
a cheerful children's application. Proposed palette:

| Token | Hex | Use |
|---|---|---|
| Warm canvas | `#F7F4EE` | Main background |
| Paper | `#FFFDF9` | Cards and surfaces |
| Ink navy | `#17233D` | Primary text and navigation |
| Sage | `#526B61` | Secondary accent and completed states |
| Sky | `#DDEAF2` | Informational surfaces |
| Coral | `#C86452` | Urgent and warning accents |
| Soft gold | `#C7A45C` | Limited premium detail |
| Border | `#DDD8CF` | Quiet boundaries |

Typography: legible sans (Geist/Inter) for interface/body; restrained serif
(Newsreader) for selected headings/quotations. Minimum body size 16px public,
15px in dense tables.

### 9.1A / 9.1B — Creative direction and acceptance gate (hard requirements)

Signature visual idea: **noise becoming a plan** — scattered message fragments
move through a restrained verification line and resolve into one elegant action
stack. Custom-built, not stock. 12-column desktop grid, ~1,280px max width,
asymmetric editorial compositions, generous vertical rhythm. No default
"centered headline over three feature cards" homepage, no AI-gradient blobs, no
glassmorphism excess, no cartoon families, no fake logo strips, no lorem ipsum,
no "revolutionize / seamless / game-changing" copy.

Acceptance gate: homepage inspected at 1440/1280/1024/768/390/375; hero
communicates product, customer, outcome, action without scrolling; coded product
preview readable and interactive on mobile; one token system across
spacing/type/buttons/forms/cards/nav/dialogs/emails; hover/focus/active/disabled/
loading/success/warning/error states designed; no horizontal overflow, layout
shift, clipped text, hydration warnings, broken links, or console errors; a human
reviewer can distinguish the brand from a generic SaaS starter within five
seconds.

## 12. Functional requirements (Release 0 subset)

- **FR-COM-001/002/003/004/005** — Stripe Checkout for one-time & subscription;
  verify webhook signatures; idempotent webhook processing; create the family
  workspace only after verified payment or authorized operator action; store
  Stripe identifiers, never card data.
- **FR-ONB-001/002/003/004** — Multi-step onboarding with save-and-resume;
  require acceptance of Terms, Privacy, and prohibited-content guidance; allow
  children by nickname/initials; adult invitations via expiring single-use
  tokens (Release 1).
- **FR-DATA-005** — Separate production, preview, and development data.

## 13. Data model (Release 0 subset)

PostgreSQL, UUID primary keys, UTC timestamps, `created_at`/`updated_at`. Every
family-owned record carries `family_id` directly or via a protected relationship.
Release 0 tables: `orders`, `families`, `family_members`, `children`,
`onboarding_submissions`, `consents`, `notifications`, `analytics_events`,
`ops_events`. Full model (sources, extraction, items, review) arrives in
Releases 1–2.

## 16. Security, privacy, and safety (Release 0)

Data minimization (nickname/initials, no DOB, no portal credentials, no
sensitive documents, no card storage). Verify Stripe webhook signatures; enforce
idempotency; server-only secrets; private storage; rate-limit public forms;
protect operator routes; record privileged access. No compliance claims
(FERPA/COPPA/PIPEDA/SOC 2/HIPAA) until counsel and the technical work confirm
them.

## 19. Release 0 acceptance criteria

- A visitor can understand the offer and price on mobile and desktop.
- A test customer can complete payment using Stripe test mode.
- A verified webhook creates exactly one order even after repeated delivery.
- A customer can complete onboarding and add two children.
- Operations can identify paid orders awaiting materials.
- No fabricated testimonials, ratings, or customer statistics appear.
- Accessibility smoke tests pass.
- Production build succeeds without TypeScript or lint errors.

## 22.2 Master prompt (operating rules honored by this build)

1. Implement only Release 0. 2. Plan before editing. 3. Next.js App Router +
TypeScript strict. 4/4A. Accessible, custom design system honoring 9.1A/9.1B.
5. No fabricated proof. 6. No portal credentials / full inbox access. 7. No
secrets in client code, source control, logs, or docs. 8. Validate every server
input; verify webhook signatures; idempotent processing. 9. External services
behind typed adapters. 10. Deployable after every milestone. 11. Tests for
acceptance criteria. 12. Format/lint/typecheck/tests/build before "done". 13.
Stop and explain any unsafe/impossible/inconsistent requirement.

## 29. Definition of done (Release 0)

School Inbox Release 0 is done when a real parent can discover the service,
understand it, pay through verified checkout, complete secure onboarding, receive
clear next steps, and be served through a documented manual workflow — without
fake proof, unnecessary inbox access, or an unfinished application standing
between the customer and the promised result.
