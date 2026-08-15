import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, Card } from "@/components/shared/ui";
import { ButtonLink } from "@/components/shared/button";
import { SourceFlow } from "@/components/marketing/source-flow";
import { VerificationComparison } from "@/components/marketing/verification-comparison";
import {
  MailIcon,
  ShieldIcon,
  CalendarIcon,
  AlertIcon,
  DocIcon,
  CheckCircleIcon,
} from "@/components/shared/icons";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Send it, we verify it, your family sees the plan. The complete process " +
    "behind a School Inbox rescue — and exactly what you receive.",
};

const STEPS = [
  {
    icon: MailIcon,
    n: "01",
    title: "Send it",
    body: "Forward or upload the school, camp, and activity information you already receive. Emails and newsletters, PDFs, screenshots of portal pages, group-chat captures, and photos of paper flyers all work.",
    detail: [
      "No inbox connection and no school-portal password.",
      "You decide exactly what to include.",
      "Send it however is easiest — one batch or a few at a time.",
    ],
  },
  {
    icon: ShieldIcon,
    n: "02",
    title: "We verify it",
    body: "We read every source and pull out the dates, actions, links, costs, and requirements. Consequential details — pickups, payments, consent forms, urgent changes — are checked against your original source by a person before anything is published.",
    detail: [
      "Ambiguous or conflicting information is flagged, not guessed.",
      "Vague phrases like “next Thursday” are held for your confirmation.",
      "A schedule change keeps the old value beside the new one.",
    ],
  },
  {
    icon: CalendarIcon,
    n: "03",
    title: "Your family sees the plan",
    body: "You receive a verified 60–90-day calendar, a prioritized action list, and a reminder plan — shared with the co-parent or caregiver who needs the same view.",
    detail: [
      "Every item links back to the message it came from.",
      "Actions stay visible until they’re done, dismissed, or expired.",
      "A Sunday Week Ahead briefing sets up each week.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="Three steps. The reading and remembering are ours."
        intro="No new app to learn and no inbox to hand over. You send what you already receive; we return a plan your whole family can trust — with a person checking the things that matter."
      >
        <ButtonLink href="/get-started" size="lg" withArrow>
          Start My Inbox Rescue
        </ButtonLink>
      </PageHeader>

      <Section>
        <ol className="space-y-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.n}>
                <Card className="grid gap-6 p-7 sm:p-9 lg:grid-cols-[auto_1fr_1fr] lg:items-start lg:gap-10">
                  <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                    <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-ink text-paper">
                      <Icon size={26} />
                    </span>
                    <span className="font-serif text-[2.4rem] leading-none text-ink-faint tnum">
                      {step.n}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-[1.5rem] font-semibold text-ink">
                      {step.title}
                    </h2>
                    <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft">
                      {step.body}
                    </p>
                  </div>
                  <ul className="space-y-3 lg:pt-1">
                    {step.detail.map((d) => (
                      <li key={d} className="flex items-start gap-2.5">
                        <CheckCircleIcon
                          size={18}
                          className="mt-0.5 shrink-0 text-[var(--sage)]"
                        />
                        <span className="text-[0.94rem] text-ink-soft">
                          {d}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section tone="paper">
        <div className="max-w-2xl">
          <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)] font-semibold leading-[1.1] text-ink">
            From scattered messages to one organized plan.
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            Whatever the format, it resolves into four kinds of output your
            family can act on.
          </p>
        </div>
        <div className="mt-12">
          <SourceFlow />
        </div>
      </Section>

      <Section>
        <div className="max-w-2xl">
          <h2 className="text-[clamp(1.7rem,3.5vw,2.6rem)] font-semibold leading-[1.1] text-ink">
            What makes it verified, not just summarized.
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            The same email in an ordinary AI summarizer and in School Inbox
            produce very different things.
          </p>
        </div>
        <div className="mt-10">
          <VerificationComparison />
        </div>
      </Section>

      <Section tone="ink">
        <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-[1.08] text-paper">
              See a real, working sample before you buy.
            </h2>
            <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-[color-mix(in_srgb,var(--paper)_75%,transparent)]">
              The sample briefing is the actual interface, with fictional data —
              switch tabs, open a source, mark an item done.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <ButtonLink href="/sample-briefing" size="lg">
              See a Sample Briefing
            </ButtonLink>
            <ButtonLink href="/get-started" size="lg" variant="secondary">
              Start My Rescue
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* Boundaries — honest about what we do not do. */}
      <Section tone="paper">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-canvas p-7">
            <span className="inline-flex items-center gap-2 text-[var(--sage)]">
              <CheckCircleIcon size={20} />
              <span className="text-[0.8rem] font-semibold uppercase tracking-[0.06em]">
                What we do
              </span>
            </span>
            <ul className="mt-4 space-y-2.5 text-[0.96rem] text-ink-soft">
              {[
                "Read school, camp, and activity communications you send us.",
                "Build a verified calendar and prioritized action list.",
                "Flag ambiguity and preserve every source.",
                "Share the plan with a co-parent or caregiver.",
              ].map((x) => (
                <li key={x} className="flex gap-2.5">
                  <CheckCircleIcon
                    size={18}
                    className="mt-0.5 shrink-0 text-[var(--sage)]"
                  />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-canvas p-7">
            <span className="inline-flex items-center gap-2 text-[var(--coral)]">
              <AlertIcon size={20} />
              <span className="text-[0.8rem] font-semibold uppercase tracking-[0.06em]">
                What we never do
              </span>
            </span>
            <ul className="mt-4 space-y-2.5 text-[0.96rem] text-ink-soft">
              {[
                "Sign forms, grant consent, or make payments for you.",
                "Reply to teachers or the school on your behalf.",
                "Connect to your full email inbox or a school portal.",
                "Handle medical, custody, legal, or financial documents.",
              ].map((x) => (
                <li key={x} className="flex gap-2.5">
                  <DocIcon
                    size={18}
                    className="mt-0.5 shrink-0 text-ink-faint"
                  />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
