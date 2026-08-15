"use client";

import { useId, useState } from "react";
import {
  SAMPLE_ITEMS,
  KIND_LABEL,
  childFor,
  type SampleItem,
} from "@/lib/sample-data";
import { ChildChip } from "./child-chip";
import { Badge } from "@/components/shared/ui";
import {
  AlertIcon,
  CheckCircleIcon,
  ClockIcon,
  DocIcon,
  LinkIcon,
  SwapIcon,
  TagIcon,
} from "@/components/shared/icons";
import { cx } from "@/lib/cx";

type TabKey = "today" | "week" | "clarify";

const TABS: { key: TabKey; label: string; itemIds: string[] }[] = [
  { key: "today", label: "Today", itemIds: ["i1", "i2"] },
  { key: "week", label: "This Week", itemIds: ["i3", "i4", "i5"] },
  { key: "clarify", label: "Clarification Needed", itemIds: ["i6"] },
];

function byId(id: string): SampleItem {
  return SAMPLE_ITEMS.find((i) => i.id === id)!;
}

function KindIcon({ item }: { item: SampleItem }) {
  const cls = "text-ink-faint";
  switch (item.kind) {
    case "schedule_change":
      return <SwapIcon size={18} className={cls} />;
    case "form":
    case "reference":
      return <DocIcon size={18} className={cls} />;
    case "event":
      return <ClockIcon size={18} className={cls} />;
    default:
      return <TagIcon size={18} className={cls} />;
  }
}

function StatusBadge({ item }: { item: SampleItem }) {
  if (item.status === "needs_attention")
    return (
      <Badge tone="coral">
        <AlertIcon size={13} /> Needs your attention
      </Badge>
    );
  if (item.status === "completed")
    return (
      <Badge tone="sage">
        <CheckCircleIcon size={13} /> Completed
      </Badge>
    );
  if (item.status === "clarify")
    return <Badge tone="gold">Clarification needed</Badge>;
  return <Badge tone="sky">Open</Badge>;
}

function ItemRow({ item }: { item: SampleItem }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(item.status === "completed");
  const drawerId = useId();
  const child = childFor(item.childId);

  return (
    <li
      className={cx(
        "rounded-[var(--radius-md)] border bg-paper p-4 transition-colors",
        item.status === "needs_attention"
          ? "border-[var(--coral)]/35 bg-[color-mix(in_srgb,var(--coral-soft)_40%,var(--paper))]"
          : "border-[var(--border)]",
        done && "opacity-75",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <KindIcon item={item} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ChildChip child={child} />
            <span className="text-[0.7rem] font-medium uppercase tracking-wide text-ink-faint">
              {KIND_LABEL[item.kind]}
            </span>
          </div>
          <h4
            className={cx(
              "mt-1.5 text-[0.98rem] font-semibold leading-snug text-ink",
              done && "line-through decoration-[var(--sage)]/60",
            )}
          >
            {item.title}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem] text-ink-soft tnum">
            <span className="inline-flex items-center gap-1">
              <ClockIcon size={14} className="text-ink-faint" />
              {item.when}
            </span>
            {item.cost && <span>· {item.cost}</span>}
            <span>· {item.assignee}</span>
          </div>

          {item.supersedes && (
            <p className="mt-2 rounded-md bg-[var(--sky)] px-2.5 py-1.5 text-[0.8rem] text-[#2c4a63]">
              <SwapIcon size={13} className="mr-1 inline align-[-2px]" />
              {item.supersedes} — previous value kept, not overwritten.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge item={item} />
            {item.verified && (
              <span className="inline-flex items-center gap-1 text-[0.74rem] font-medium text-[var(--sage)]">
                <CheckCircleIcon size={13} /> Human-verified
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={drawerId}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.8rem] font-medium text-ink-soft ring-1 ring-[var(--border)] transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <DocIcon size={14} />
              {open ? "Hide source" : "View source"}
            </button>
            {item.status !== "clarify" && (
              <button
                type="button"
                onClick={() => setDone((v) => !v)}
                className={cx(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.8rem] font-medium transition-colors",
                  done
                    ? "text-ink-soft ring-1 ring-[var(--border)] hover:bg-[var(--surface-sunken)]"
                    : "bg-[var(--sage)] text-paper hover:bg-[#455c52]",
                )}
              >
                <CheckCircleIcon size={14} />
                {done ? "Undo" : "Mark done"}
              </button>
            )}
          </div>

          {open && (
            <div
              id={drawerId}
              className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] p-3"
            >
              <div className="flex items-center gap-2 text-[0.78rem] font-semibold text-ink-soft">
                {item.actionUrl && <LinkIcon size={14} />}
                {item.source.label}
                <span className="ml-auto font-normal text-ink-faint tnum">
                  {item.source.received}
                </span>
              </div>
              <p className="mt-1.5 border-l-2 border-[var(--gold)] pl-3 text-[0.86rem] italic leading-relaxed text-ink-soft">
                “{item.source.excerpt}”
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function SampleBriefing({ className }: { className?: string }) {
  const [tab, setTab] = useState<TabKey>("today");
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div
      className={cx(
        "overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-sunken)] shadow-[var(--shadow-lg)]",
        className,
      )}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-paper px-4 py-3">
        <span className="text-[0.82rem] font-semibold text-ink">
          The Rivera Family
        </span>
        <Badge tone="neutral" className="ml-1">
          Product preview
        </Badge>
        <span className="ml-auto text-[0.75rem] text-ink-faint">
          Sunday Week Ahead
        </span>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Sample briefing views"
        className="flex gap-1 border-b border-[var(--border)] bg-paper px-2"
      >
        {TABS.map((t) => {
          const active = t.key === tab;
          const count = t.itemIds.length;
          return (
            <button
              key={t.key}
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={active}
              aria-controls={`panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={cx(
                "relative flex items-center gap-1.5 px-3 py-3 text-[0.85rem] font-medium transition-colors",
                active ? "text-ink" : "text-ink-faint hover:text-ink-soft",
              )}
            >
              {t.label}
              <span
                className={cx(
                  "rounded-full px-1.5 py-0.5 text-[0.68rem] tnum",
                  active
                    ? "bg-ink text-paper"
                    : "bg-[var(--surface-sunken)] text-ink-faint",
                )}
              >
                {count}
              </span>
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="max-h-[560px] overflow-y-auto p-3 sm:p-4"
      >
        {tab === "clarify" && (
          <p className="mb-3 rounded-md bg-[var(--gold-soft)] px-3 py-2 text-[0.82rem] text-[#8a6d29]">
            We never turn a vague phrase into a firm date. These wait for your
            confirmation.
          </p>
        )}
        <ul className="space-y-3">
          {current.itemIds.map((id) => (
            <ItemRow key={id} item={byId(id)} />
          ))}
        </ul>
      </div>
    </div>
  );
}
