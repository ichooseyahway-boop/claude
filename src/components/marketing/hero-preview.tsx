"use client";

import { useId, useState } from "react";
import { childFor } from "@/lib/sample-data";
import { ChildChip } from "./child-chip";
import {
  AlertIcon,
  CheckCircleIcon,
  DocIcon,
  MailIcon,
  ImageIcon,
  FlyerIcon,
  ChatIcon,
  SwapIcon,
  SparkVerifyIcon,
} from "@/components/shared/icons";
import { cx } from "@/lib/cx";

/**
 * The hero's signature visual: scattered source fragments on the left settle,
 * pass a verification line, and resolve into one organized action stack on the
 * right. Custom-built, interactive, and legible on mobile (§9.1A / §9.1B).
 */

const SOURCES = [
  {
    icon: MailIcon,
    label: "Sports email",
    rot: "-3deg",
    top: "2%",
    left: "0%",
  },
  {
    icon: DocIcon,
    label: "Newsletter PDF",
    rot: "2.5deg",
    top: "26%",
    left: "40%",
  },
  {
    icon: ImageIcon,
    label: "Screenshot",
    rot: "-1.5deg",
    top: "52%",
    left: "6%",
  },
  { icon: ChatIcon, label: "Group chat", rot: "4deg", top: "60%", left: "52%" },
  {
    icon: FlyerIcon,
    label: "Paper flyer",
    rot: "-4deg",
    top: "80%",
    left: "20%",
  },
] as const;

interface PreviewItem {
  childId: string;
  title: string;
  when: string;
  tone: "attention" | "change" | "done";
  supersedes?: string;
  source: { label: string; excerpt: string };
}

const ITEMS: PreviewItem[] = [
  {
    childId: "c2",
    title: "Permission form + $14 trip fee",
    when: "Return by Fri, Sep 12",
    tone: "attention",
    source: {
      label: "Grade 1 Newsletter (PDF)",
      excerpt:
        "Signed slips and the $14 fee return to the office no later than " +
        "Friday, September 12.",
    },
  },
  {
    childId: "c1",
    title: "Early dismissal now 1:15 PM",
    when: "Thu, Sep 18",
    tone: "change",
    supersedes: "Was 2:45 PM",
    source: {
      label: "School email — Office",
      excerpt:
        "Revised early-dismissal time of 1:15 PM (updated from 2:45 PM).",
    },
  },
  {
    childId: "c1",
    title: "Meet-the-teacher evening",
    when: "Tue, Sep 23 · done",
    tone: "done",
    source: {
      label: "School email — Principal",
      excerpt: "Meet-the-Teacher evening, Tuesday September 23, 6:30–7:30 PM.",
    },
  },
];

function PreviewRow({ item, index }: { item: PreviewItem; index: number }) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const child = childFor(item.childId);

  return (
    <li
      className="si-settle rounded-[var(--radius-md)] border border-[var(--border)] bg-paper p-3.5"
      style={
        {
          animationDelay: `${360 + index * 130}ms`,
          "--si-rot": index % 2 === 0 ? "-1.2deg" : "1.4deg",
        } as React.CSSProperties
      }
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cx(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
            item.tone === "attention" &&
              "bg-[var(--coral-soft)] text-[var(--coral)]",
            item.tone === "change" && "bg-[var(--sky)] text-[#2c4a63]",
            item.tone === "done" && "bg-[var(--sage-soft)] text-[var(--sage)]",
          )}
        >
          {item.tone === "attention" && <AlertIcon size={16} />}
          {item.tone === "change" && <SwapIcon size={16} />}
          {item.tone === "done" && <CheckCircleIcon size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ChildChip child={child} />
            {item.tone === "attention" && (
              <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--coral)]">
                Needs you
              </span>
            )}
          </div>
          <p
            className={cx(
              "mt-1 text-[0.9rem] font-semibold leading-snug text-ink",
              item.tone === "done" &&
                "line-through decoration-[var(--sage)]/60",
            )}
          >
            {item.title}
          </p>
          <p className="mt-0.5 text-[0.8rem] text-ink-soft tnum">
            {item.when}
            {item.supersedes && (
              <span className="ml-1.5 rounded bg-[var(--sky)] px-1.5 py-0.5 text-[0.72rem] text-[#2c4a63]">
                {item.supersedes}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={drawerId}
            className="mt-2 inline-flex items-center gap-1 text-[0.76rem] font-medium text-ink-soft underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            <DocIcon size={13} />
            {open ? "Hide source" : "Source"}
          </button>
          {open && (
            <p
              id={drawerId}
              className="mt-1.5 border-l-2 border-[var(--gold)] pl-2.5 text-[0.78rem] italic leading-relaxed text-ink-soft"
            >
              {item.source.label}: “{item.source.excerpt}”
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function HeroPreview() {
  return (
    <div className="relative">
      {/* Scattered incoming sources — decorative, settling into place. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 -top-6 hidden h-[88%] w-32 md:block"
      >
        {SOURCES.map((s, i) => {
          const Icon = s.icon;
          return (
            <span
              key={s.label}
              className="si-settle absolute inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-paper px-2 py-1.5 text-[0.66rem] font-medium text-ink-soft shadow-[var(--shadow-sm)]"
              style={
                {
                  top: s.top,
                  left: s.left,
                  animationDelay: `${i * 90}ms`,
                  "--si-rot": s.rot,
                } as React.CSSProperties
              }
            >
              <Icon size={13} className="text-ink-faint" />
              {s.label}
            </span>
          );
        })}
      </div>

      {/* The organized plan */}
      <div className="si-rise relative rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-sunken)] p-2 shadow-[var(--shadow-lg)] md:ml-16">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-ink">
            <SparkVerifyIcon size={16} className="text-[var(--gold)]" />
            Today &amp; This Week
          </span>
          <span className="ml-auto rounded-full bg-paper px-2 py-0.5 text-[0.68rem] font-medium text-ink-faint ring-1 ring-[var(--border)]">
            Product preview
          </span>
        </div>
        <ul className="space-y-2 px-1.5 pb-1.5">
          {ITEMS.map((item, i) => (
            <PreviewRow key={item.title} item={item} index={i} />
          ))}
        </ul>
        <p className="px-3 pb-2 pt-1 text-[0.72rem] text-ink-faint">
          Fictional data shown for demonstration — not a real family account.
        </p>
      </div>
    </div>
  );
}
