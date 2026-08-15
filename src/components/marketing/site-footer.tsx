import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import { Shell } from "@/components/shared/ui";
import { footerNav, site } from "@/lib/config/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-paper">
      <Shell className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Wordmark />
            <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
              Human-verified school administration for families juggling more
              than one calendar. You choose what to send; we make sure nothing
              important quietly disappears.
            </p>
          </div>

          {footerNav.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                {group.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-[0.95rem] text-ink-soft transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[var(--border)] pt-6 text-[0.85rem] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. A human-verified service — not operated by
            your child&rsquo;s school or district.
          </p>
          <p>
            Questions?{" "}
            <a
              href={`mailto:${site.supportEmail}`}
              className="text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              {site.supportEmail}
            </a>
          </p>
        </div>
      </Shell>
    </footer>
  );
}
