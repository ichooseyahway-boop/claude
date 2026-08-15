import {
  MailIcon,
  DocIcon,
  ChatIcon,
  FlyerIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  TagIcon,
  ArrowRightIcon,
  SparkVerifyIcon,
} from "@/components/shared/icons";

const SOURCES = [
  { icon: MailIcon, label: "Newsletter" },
  { icon: DocIcon, label: "PDF" },
  { icon: MailIcon, label: "Sports email" },
  { icon: ChatIcon, label: "Group-chat screenshot" },
  { icon: FlyerIcon, label: "Paper flyer" },
] as const;

const OUTPUTS = [
  { icon: CalendarIcon, label: "Calendar", tone: "sky" },
  { icon: CheckCircleIcon, label: "Action", tone: "sage" },
  { icon: ClockIcon, label: "Reminder", tone: "coral" },
  { icon: TagIcon, label: "Reference", tone: "gold" },
] as const;

const toneBg: Record<string, string> = {
  sky: "bg-[var(--sky)] text-[#2c4a63]",
  sage: "bg-[var(--sage-soft)] text-[var(--sage)]",
  coral: "bg-[var(--coral-soft)] text-[var(--coral)]",
  gold: "bg-[var(--gold-soft)] text-[#8a6d29]",
};

export function SourceFlow() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
      {/* Scattered sources */}
      <div>
        <p className="mb-4 text-[0.82rem] font-semibold uppercase tracking-[0.06em] text-ink-faint">
          What arrives
        </p>
        <ul className="flex flex-wrap gap-2.5">
          {SOURCES.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.label}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-paper px-3 py-2.5 text-[0.86rem] text-ink-soft shadow-[var(--shadow-sm)]"
                style={{
                  transform: `rotate(${i % 2 === 0 ? "-1.5deg" : "1.5deg"})`,
                }}
              >
                <Icon size={17} className="text-ink-faint" />
                {s.label}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Verification line */}
      <div className="flex items-center justify-center gap-1 lg:flex-col lg:gap-2">
        <ArrowRightIcon size={26} className="text-ink-faint lg:hidden" />
        <span className="hidden lg:block h-14 w-px bg-[var(--border-strong)]" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[0.76rem] font-semibold text-paper">
          <SparkVerifyIcon size={14} className="text-[var(--gold)]" />
          Verified
        </span>
        <span className="hidden lg:block h-14 w-px bg-[var(--border-strong)]" />
        <ArrowRightIcon size={26} className="text-ink-faint lg:hidden" />
      </div>

      {/* Organized outputs */}
      <div>
        <p className="mb-4 text-[0.82rem] font-semibold uppercase tracking-[0.06em] text-ink-faint lg:text-right">
          What your family sees
        </p>
        <ul className="grid grid-cols-2 gap-2.5">
          {OUTPUTS.map((o) => {
            const Icon = o.icon;
            return (
              <li
                key={o.label}
                className="inline-flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-paper px-3 py-3"
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full ${toneBg[o.tone]}`}
                >
                  <Icon size={17} />
                </span>
                <span className="text-[0.9rem] font-medium text-ink">
                  {o.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
