import Link from "next/link";
import { cx } from "@/lib/cx";
import { site } from "@/lib/config/site";

/**
 * The wordmark: a small custom glyph (an inbox tray with a verified check
 * resting in it) beside the name. No stock logo, no cartoon bus.
 */
export function Wordmark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex items-center gap-2.5 rounded-md",
        className,
      )}
      aria-label={`${site.name} — home`}
    >
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink text-paper shadow-[var(--shadow-sm)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 13.5 6 6.2A2 2 0 0 1 7.9 4.7h8.2A2 2 0 0 1 18 6.2L20 13.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 13.5h4.4l1 2.1h5.2l1-2.1H20v4.3A1.7 1.7 0 0 1 18.3 19.5H5.7A1.7 1.7 0 0 1 4 17.8Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="m9.6 9 1.6 1.6L15 7"
            stroke="var(--gold)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[1.06rem] font-semibold tracking-[-0.01em] text-ink">
        {site.wordmark}
      </span>
    </Link>
  );
}
