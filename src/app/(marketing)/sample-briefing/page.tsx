import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { Section } from "@/components/shared/ui";
import { ButtonLink } from "@/components/shared/button";
import { SampleBriefing } from "@/components/marketing/sample-briefing";
import { AnalyticsBeacon } from "@/components/shared/analytics-beacon";
import { CheckCircleIcon, DocIcon, SwapIcon } from "@/components/shared/icons";

export const metadata: Metadata = {
  title: "Sample Briefing",
  description:
    "A working preview of the School Inbox deliverable. Switch between Today, " +
    "This Week, and Clarification Needed, open any item's source, and mark " +
    "items complete. Fictional data for demonstration.",
};

export default function SampleBriefingPage() {
  return (
    <>
      <AnalyticsBeacon event="sample_briefing_opened" />
      <PageHeader
        eyebrow="The deliverable"
        title="A sample briefing you can actually use."
        intro="This is the real interface, filled with fictional data. Try it: switch tabs, open the source behind any item, and mark something done. Nothing here is a real family — it's a demonstration of what your rescue produces."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start lg:gap-14">
          <SampleBriefing />

          <aside className="lg:sticky lg:top-24">
            <h2 className="text-[1.3rem] font-semibold text-ink">
              What you&rsquo;re looking at
            </h2>
            <ul className="mt-5 space-y-5">
              {[
                {
                  icon: DocIcon,
                  t: "Source-view controls",
                  b: "Open “Source” on any item to see the exact excerpt it was drawn from, and when it arrived. Every item is traceable.",
                },
                {
                  icon: SwapIcon,
                  t: "Schedule changes keep history",
                  b: "When a time changes, the previous value stays visible. Nothing is silently overwritten.",
                },
                {
                  icon: CheckCircleIcon,
                  t: "Completion you control",
                  b: "Mark items done as your family handles them. Open actions stay in your briefings until resolved.",
                },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.t} className="flex gap-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--sage-soft)] text-[var(--sage)]">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3 className="text-[1.02rem] font-semibold text-ink">
                        {f.t}
                      </h3>
                      <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-soft">
                        {f.b}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-paper p-6">
              <p className="text-[0.98rem] font-medium text-ink">
                Ready for this, but with your family&rsquo;s real information?
              </p>
              <div className="mt-4">
                <ButtonLink
                  href="/get-started"
                  size="lg"
                  className="w-full"
                  withArrow
                >
                  Start My Inbox Rescue
                </ButtonLink>
              </div>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
