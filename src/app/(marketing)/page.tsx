import type { Metadata } from "next";
import Link from "next/link";
import { Section, Shell, Eyebrow, Badge } from "@/components/shared/ui";
import { ButtonLink } from "@/components/shared/button";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { SampleBriefing } from "@/components/marketing/sample-briefing";
import { SourceFlow } from "@/components/marketing/source-flow";
import { VerificationComparison } from "@/components/marketing/verification-comparison";
import { OfferCard } from "@/components/marketing/offer-card";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { AnalyticsBeacon } from "@/components/shared/analytics-beacon";
import {
  TagIcon,
  SwapIcon,
  ShieldIcon,
  LockIcon,
  MailIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "@/components/shared/icons";
import { OFFERS } from "@/lib/config/offers";
import { FAQS } from "@/lib/config/faq";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Never miss another school deadline",
  description: site.description,
};

export default function HomePage() {
  return (
    <>
      <AnalyticsBeacon event="landing_viewed" />

      {/* ================= Section 1 — Hero ================= */}
      <Shell className="pb-14 pt-12 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_1fr] lg:gap-8">
          <div className="max-w-xl">
            <Eyebrow>Human-verified school administration</Eyebrow>
            <h1 className="mt-4 text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[1.03] tracking-[-0.02em] text-ink">
              Never miss another{" "}
              <span className="font-serif italic text-ink">
                school deadline.
              </span>
            </h1>
            <p className="measure mt-6 text-[1.12rem] leading-relaxed text-ink-soft">
              Forward the emails, newsletters, screenshots, schedules, and
              flyers. We turn them into one verified family calendar, action
              list, and reminder plan — reviewed by a person before anything
              that matters reaches you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/get-started" size="lg" withArrow>
                Start My Inbox Rescue
              </ButtonLink>
              <ButtonLink href="/sample-briefing" size="lg" variant="secondary">
                See a Sample Briefing
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-center gap-2 text-[0.9rem] text-ink-soft">
              <LockIcon size={16} className="text-[var(--sage)]" />
              No inbox password. No school login. You choose what to send.
            </p>
          </div>

          <div className="lg:pl-4">
            <HeroPreview />
          </div>
        </div>
      </Shell>

      {/* ================= Section 2 — Recognition ================= */}
      <Section tone="paper">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.9rem,4vw,3.1rem)] font-semibold leading-[1.08] text-ink">
              The important detail is always buried in paragraph seven.
            </h2>
            <p className="measure mt-5 text-[1.05rem] leading-relaxed text-ink-soft">
              A permission slip inside a newsletter. An early dismissal three
              replies deep. A “wear blue on Wednesday” in a group chat you
              muted. The information is everywhere — and the responsibility to
              catch all of it lands on one person.
            </p>
          </div>
          <SourceFlow />
        </div>
      </Section>

      {/* ================= Section 3 — Outcome ================= */}
      <Section>
        <div className="max-w-2xl">
          <Eyebrow>What you get</Eyebrow>
          <h2 className="mt-4 text-[clamp(1.9rem,4vw,3.1rem)] font-semibold leading-[1.08] text-ink">
            We do more than summarize. We tell your family what happens next.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: TagIcon,
              title: "Know what is due.",
              body: "Forms, payments, registrations, and RSVP deadlines — each with the link and the cost, in one list.",
              tone: "sky",
            },
            {
              icon: SwapIcon,
              title: "Know what is changing.",
              body: "Early pickups, cancellations, new locations, and revised times — with the previous value kept, never silently overwritten.",
              tone: "coral",
            },
            {
              icon: CheckCircleIcon,
              title: "Know what to prepare.",
              body: "Clothing, lunches, supplies, transportation, and volunteer commitments — surfaced the day before, not the morning of.",
              tone: "sage",
            },
          ].map((card, i) => {
            const Icon = card.icon;
            const toneRing: Record<string, string> = {
              sky: "text-[#2c4a63] bg-[var(--sky)]",
              coral: "text-[var(--coral)] bg-[var(--coral-soft)]",
              sage: "text-[var(--sage)] bg-[var(--sage-soft)]",
            };
            return (
              <div
                key={card.title}
                className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-paper p-7"
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-[12px] ${toneRing[card.tone]}`}
                >
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 text-[1.2rem] font-semibold text-ink">
                  {card.title}
                </h3>
                <p className="mt-2 text-[0.96rem] leading-relaxed text-ink-soft">
                  {card.body}
                </p>
                <span className="mt-4 text-[0.8rem] font-semibold text-ink-faint tnum">
                  0{i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ================= Section 4 — How it works ================= */}
      <Section tone="ink">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="eyebrow !text-[var(--gold)]">How it works</p>
            <h2 className="mt-4 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.08] text-paper">
              Three steps. The hard part is ours.
            </h2>
            <p className="mt-5 max-w-sm text-[1.02rem] leading-relaxed text-[color-mix(in_srgb,var(--paper)_75%,transparent)]">
              No new app to learn, no inbox to connect. Send what you have and
              get back a plan your whole family can trust.
            </p>
            <div className="mt-8">
              <ButtonLink href="/how-it-works" variant="secondary" withArrow>
                See the full process
              </ButtonLink>
            </div>
          </div>

          <ol className="space-y-4">
            {[
              {
                n: "1",
                t: "Send it.",
                b: "Forward or upload the school, camp, and activity information you already receive — emails, PDFs, screenshots, photos of flyers.",
              },
              {
                n: "2",
                t: "We verify it.",
                b: "We extract every date, action, link, and requirement, then check the consequential details against your original source. Anything unclear is flagged, not guessed.",
              },
              {
                n: "3",
                t: "Your family sees the plan.",
                b: "A verified calendar, a prioritized action list, and reminders — shared with the co-parent or caregiver who needs them.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="flex gap-5 rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.04] p-6"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--gold)] font-serif text-[1.3rem] text-ink tnum">
                  {step.n}
                </span>
                <div>
                  <h3 className="text-[1.18rem] font-semibold text-paper">
                    {step.t}
                  </h3>
                  <p className="mt-1.5 text-[0.98rem] leading-relaxed text-[color-mix(in_srgb,var(--paper)_72%,transparent)]">
                    {step.b}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ================= Section 5 — Sample briefing ================= */}
      <Section tone="paper">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
          <div>
            <Eyebrow>The deliverable</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.08] text-ink">
              This is what lands in your hands.
            </h2>
            <p className="measure mt-5 text-[1.05rem] leading-relaxed text-ink-soft">
              A living briefing, not a wall of text. Switch between Today, This
              Week, and the items still waiting on your confirmation. Open any
              item to see the exact source it came from.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Every item traces back to its original message.",
                "Schedule changes show the old value and the new one.",
                "Vague dates wait for you — we never invent them.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircleIcon
                    size={19}
                    className="mt-0.5 shrink-0 text-[var(--sage)]"
                  />
                  <span className="text-[0.96rem] text-ink-soft">{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <SampleBriefing />
        </div>
      </Section>

      {/* ================= Section 6 — Why human verification ============ */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div className="max-w-md">
            <Eyebrow>The difference</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.08] text-ink">
              Why a person checks the things that matter.
            </h2>
            <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-soft">
              AI is fast, and we use it. But a wrong pickup time or a missed
              consent form is not a rounding error — it&rsquo;s your afternoon.
              So consequential items are verified by a person before they reach
              you.
            </p>
          </div>
          <VerificationComparison />
        </div>
      </Section>

      {/* ================= Section 7 — Offer ================= */}
      <Section tone="sky">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-14">
          <div className="max-w-lg">
            <Eyebrow>The offer</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.08] text-ink">
              Start with a Back-to-School Inbox Rescue.
            </h2>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-soft">
              One flat price. We do the setup, the reading, and the
              verification, and hand you a calendar and action list you can rely
              on for the term ahead.
            </p>
            <dl className="mt-7 grid grid-cols-2 gap-4 text-[0.92rem]">
              <div className="rounded-[var(--radius-md)] bg-paper/70 p-4">
                <dt className="text-ink-faint">Turnaround</dt>
                <dd className="mt-0.5 font-semibold text-ink">
                  24–48 business hrs
                </dd>
              </div>
              <div className="rounded-[var(--radius-md)] bg-paper/70 p-4">
                <dt className="text-ink-faint">Scope</dt>
                <dd className="mt-0.5 font-semibold text-ink">
                  2 children · 30 items
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-[0.86rem] text-ink-soft">
              Need more?{" "}
              <Link
                href="/pricing"
                className="font-medium text-ink underline underline-offset-2"
              >
                See pricing and Care plans
              </Link>
              .
            </p>
          </div>
          <OfferCard offer={OFFERS.rescue} featured />
        </div>
      </Section>

      {/* ================= Section 8 — Security ================= */}
      <Section tone="paper">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sage-soft)] px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--sage)]">
              <ShieldIcon size={15} /> Restraint by design
            </span>
            <h2 className="mt-5 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.08] text-ink">
              Your family information deserves restraint.
            </h2>
            <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-ink-soft">
              We ask for as little as possible and keep it for as short as
              possible. What follows is what we do and don&rsquo;t do — no
              certifications we haven&rsquo;t earned.
            </p>
            <div className="mt-7">
              <ButtonLink href="/security" variant="secondary" withArrow>
                Read the security approach
              </ButtonLink>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "You choose what to forward or upload.",
              "No school-portal password, ever.",
              "We don’t connect to your full inbox.",
              "Source material is kept only for the published period.",
              "You can request export or deletion anytime.",
              "Consequential AI output is checked before you see it.",
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-canvas px-4 py-4"
              >
                <CheckCircleIcon
                  size={19}
                  className="mt-0.5 shrink-0 text-[var(--sage)]"
                />
                <span className="text-[0.94rem] text-ink-soft">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ================= Section 9 — FAQ ================= */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
          <div>
            <Eyebrow>Questions</Eyebrow>
            <h2 className="mt-4 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.08] text-ink">
              The things parents ask first.
            </h2>
            <p className="mt-5 max-w-sm text-[1.02rem] leading-relaxed text-ink-soft">
              Still deciding?{" "}
              <Link
                href="/faq"
                className="font-medium text-ink underline underline-offset-2"
              >
                Read every question
              </Link>{" "}
              or{" "}
              <a
                href={`mailto:${site.supportEmail}`}
                className="font-medium text-ink underline underline-offset-2"
              >
                email us
              </a>
              .
            </p>
          </div>
          <FaqAccordion items={FAQS.slice(0, 6)} />
        </div>
      </Section>

      {/* ================= Section 10 — Closing CTA ================= */}
      <Section tone="ink">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="gold" className="mx-auto">
            <MailIcon size={13} /> Founding-family cohort open
          </Badge>
          <h2 className="mt-5 text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.06] text-paper">
            Stop carrying the school year in your head.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[1.08rem] leading-relaxed text-[color-mix(in_srgb,var(--paper)_75%,transparent)]">
            Hand off the reading and the remembering. Get back a plan you can
            trust — verified by a person, traceable to the source.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/get-started" size="lg" withArrow>
              Start My Inbox Rescue
            </ButtonLink>
            <ButtonLink
              href="/pricing"
              size="lg"
              variant="ghost"
              className="!text-paper hover:!bg-white/10"
            >
              See pricing
              <ArrowRightIcon size={18} />
            </ButtonLink>
          </div>
          <p className="mt-6 text-[0.85rem] text-[color-mix(in_srgb,var(--paper)_55%,transparent)]">
            A limited number of founding-family rescues are open this term.
          </p>
        </div>
      </Section>
    </>
  );
}
