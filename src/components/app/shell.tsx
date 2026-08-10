import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Messages } from '@/lib/i18n';
import { segmentFromLocale, type Locale } from '@/lib/i18n/locales';

/**
 * Authenticated application shell.
 *
 * PRD refs: 11.3, 11.4, 17.1 (accessibility).
 *
 * The navigation is rendered from a list the *server* built after checking
 * permissions. Hiding a link is presentation, never authorization — every
 * destination re-checks server-side (7.7) — but showing a customer a link they
 * cannot follow is its own failure, so both happen.
 */

export interface NavItem {
  href: string;
  label: string;
}

export function AppShell({
  locale,
  m,
  title,
  intro,
  nav,
  navLabel,
  userName,
  children,
}: {
  locale: Locale;
  m: Messages;
  title: string;
  intro?: string;
  nav: NavItem[];
  navLabel: string;
  userName: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <a
        href="#app-main"
        className="focus:bg-navy-900 sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:text-white"
      >
        {m.nav.skipToContent}
      </a>

      <header className="border-b border-[color:var(--border-subtle)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/app" className="text-navy-900 font-semibold">
            BotAssure CX
          </Link>

          <nav aria-label={navLabel} className="flex flex-wrap gap-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-navy-900 text-sm text-slate-700 underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-600">{userName}</span>
            <form method="post" action="/api/auth/sign-out">
              <input
                type="hidden"
                name="locale"
                value={segmentFromLocale(locale)}
              />
              <button
                type="submit"
                className="min-h-11 text-sm text-slate-700 underline underline-offset-4"
              >
                {m.app.nav.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main
        id="app-main"
        className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"
      >
        <h1 className="text-navy-900 text-2xl font-semibold sm:text-3xl">
          {title}
        </h1>
        {intro ? (
          <p className="mt-2 max-w-3xl text-slate-700">{intro}</p>
        ) : null}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--border-subtle)] p-8 text-center">
      <p className="text-navy-900 font-medium">{title}</p>
      {body ? <p className="mt-2 text-sm text-slate-600">{body}</p> : null}
    </div>
  );
}

const SEVERITY_CLASS: Record<string, string> = {
  critical: 'bg-red-100 text-red-900',
  high: 'bg-orange-100 text-orange-900',
  medium: 'bg-amber-100 text-amber-900',
  low: 'bg-slate-100 text-slate-800',
  observation: 'bg-slate-100 text-slate-700',
};

/**
 * Severity badge.
 *
 * Colour is never the only signal: the label is always present, because
 * WCAG 1.4.1 forbids conveying information by colour alone and a reader with a
 * colour-vision difference must still be able to sort a findings table.
 */
export function SeverityBadge({
  severity,
  label,
}: {
  severity: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        SEVERITY_CLASS[severity] ?? 'bg-slate-100 text-slate-800'
      }`}
    >
      {label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-navy-900 mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
