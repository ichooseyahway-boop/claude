import type { ChildLabel } from "@/lib/sample-data";

/**
 * A sophisticated, accessible child label. Colour is a supporting cue only —
 * the initial/name carries the meaning, never colour alone (PRD §17).
 */
export function ChildChip({ child }: { child: ChildLabel }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] py-0.5 pl-1 pr-2.5 text-[0.72rem] font-semibold text-ink-soft">
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-full ring-2 ring-paper"
        style={{ backgroundColor: `var(${child.colorVar})` }}
      />
      <span>{child.label}</span>
      <span className="sr-only"> ({child.grade})</span>
    </span>
  );
}
