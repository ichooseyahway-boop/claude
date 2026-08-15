import type { ReactNode } from "react";
import { Shell } from "@/components/shared/ui";
import { AlertIcon } from "@/components/shared/icons";

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

/**
 * Renders a legal document with a prominent, honest "pending legal review"
 * banner. Release 0 ships these as clearly-marked placeholders (PRD §19); they
 * must be reviewed by counsel before public launch.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <Shell className="py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div
          role="note"
          className="mb-10 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--gold)]/40 bg-[var(--gold-soft)] px-5 py-4"
        >
          <AlertIcon size={20} className="mt-0.5 shrink-0 text-[#8a6d29]" />
          <p className="text-[0.92rem] leading-relaxed text-[#7a601f]">
            <strong>Draft — pending legal review.</strong> This document is a
            working placeholder written for the build. It has not been reviewed
            by qualified counsel and is not yet the operative agreement. It must
            be finalized before public launch.
          </p>
        </div>

        <p className="text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          Legal
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.05] text-ink">
          {title}
        </h1>
        <p className="mt-3 text-[0.9rem] text-ink-faint tnum">
          Last updated: {updated}
        </p>
        <p className="mt-6 text-[1.05rem] leading-relaxed text-ink-soft">
          {intro}
        </p>

        <div className="mt-12 space-y-10">
          {sections.map((s, i) => (
            <section key={s.heading} className="scroll-mt-24">
              <h2 className="text-[1.3rem] font-semibold text-ink">
                <span className="mr-2 text-ink-faint tnum">{i + 1}.</span>
                {s.heading}
              </h2>
              <div className="mt-3 space-y-3 text-[0.98rem] leading-relaxed text-ink-soft [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Shell>
  );
}
