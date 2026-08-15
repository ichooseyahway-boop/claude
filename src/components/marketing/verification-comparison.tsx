import { CheckIcon, CloseIcon } from "@/components/shared/icons";

/** PRD §9.3 Section 6 — the human-verification difference, side by side. */
const ROWS: { ordinary: string; schoolInbox: string }[] = [
  {
    ordinary: "Condenses the message",
    schoolInbox: "Identifies the commitments",
  },
  {
    ordinary: "May infer missing details",
    schoolInbox: "Flags missing details",
  },
  {
    ordinary: "Produces another block of text",
    schoolInbox: "Creates actions, dates, and owners",
  },
  {
    ordinary: "Source may be hard to trace",
    schoolInbox: "Every item keeps its source",
  },
  {
    ordinary: "Stops after summarizing",
    schoolInbox: "Keeps unresolved items visible",
  },
];

export function VerificationComparison() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
      <div className="grid grid-cols-2">
        <div className="border-r border-[var(--border)] bg-[var(--surface-sunken)] px-5 py-4 sm:px-7">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-ink-faint">
            Ordinary AI summary
          </p>
        </div>
        <div className="bg-[var(--sage-soft)] px-5 py-4 sm:px-7">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-[var(--sage)]">
            School Inbox
          </p>
        </div>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {ROWS.map((row) => (
          <li key={row.schoolInbox} className="grid grid-cols-2">
            <div className="flex items-start gap-2.5 border-r border-[var(--border)] px-5 py-4 sm:px-7">
              <CloseIcon size={17} className="mt-0.5 shrink-0 text-ink-faint" />
              <span className="text-[0.92rem] text-ink-soft">
                {row.ordinary}
              </span>
            </div>
            <div className="flex items-start gap-2.5 bg-[color-mix(in_srgb,var(--sage-soft)_45%,var(--paper))] px-5 py-4 sm:px-7">
              <CheckIcon
                size={17}
                className="mt-0.5 shrink-0 text-[var(--sage)]"
              />
              <span className="text-[0.92rem] font-medium text-ink">
                {row.schoolInbox}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
