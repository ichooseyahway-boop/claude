import type { ReactNode } from "react";
import { Shell, Eyebrow } from "@/components/shared/ui";

/** Consistent interior-page header. Editorial, not a hero banner. */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] bg-paper">
      <Shell className="pb-14 pt-12 sm:pt-16">
        <div className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-[clamp(2.1rem,5vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {intro && (
            <p className="measure mt-6 text-[1.1rem] leading-relaxed text-ink-soft">
              {intro}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </div>
      </Shell>
    </div>
  );
}
