import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Constrained content shell (max 1280px, fluid gutters). */
export function Shell({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: ElementType;
}) {
  return <As className={cx("shell", className)}>{children}</As>;
}

/** A page section with generous, consistent vertical rhythm (§9.1A). */
export function Section({
  className,
  children,
  id,
  tone = "canvas",
}: {
  className?: string;
  children: ReactNode;
  id?: string;
  tone?: "canvas" | "paper" | "ink" | "sky";
}) {
  const tones: Record<string, string> = {
    canvas: "",
    paper: "bg-paper",
    ink: "bg-ink text-paper",
    sky: "bg-[var(--sky)]",
  };
  return (
    <section
      id={id}
      className={cx("py-[clamp(72px,10vw,144px)]", tones[tone], className)}
    >
      <Shell>{children}</Shell>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

type BadgeTone = "sage" | "coral" | "gold" | "sky" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  sage: "bg-[var(--sage-soft)] text-[var(--sage)] ring-[var(--sage)]/15",
  coral: "bg-[var(--coral-soft)] text-[var(--coral)] ring-[var(--coral)]/20",
  gold: "bg-[var(--gold-soft)] text-[#8a6d29] ring-[var(--gold)]/25",
  sky: "bg-[var(--sky)] text-[#2c4a63] ring-[#2c4a63]/10",
  neutral: "bg-[var(--surface-sunken)] text-ink-soft ring-[var(--border)]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: { tone?: BadgeTone } & ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1",
        badgeTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** A layered paper surface with a hairline border. */
export function Card({
  className,
  children,
  as: As = "div",
  ...props
}: {
  className?: string;
  children: ReactNode;
  as?: ElementType;
} & ComponentPropsWithoutRef<"div">) {
  return (
    <As
      className={cx(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-paper",
        className,
      )}
      {...props}
    >
      {children}
    </As>
  );
}
