'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LOCALE_LABELS, LOCALES, switchLocalePath, type Locale } from '@/lib/i18n/config';

/**
 * Language switcher.
 *
 * FR-MKT-001 requires language switching to preserve the equivalent route: a
 * visitor reading the pricing page in English must land on the pricing page in
 * French, not on the French home page.
 *
 * That means the switcher needs the current pathname, which a server layout
 * does not receive — so this is the one client component in the marketing
 * chrome. It renders plain anchors, so it still works without JavaScript once
 * hydrated, and `switchLocalePath` is the same helper the unit tests cover.
 */
export function LanguageSwitcher({
  locale,
  label,
}: {
  readonly locale: Locale;
  readonly label: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      {LOCALES.map((candidate) => {
        const isCurrent = candidate === locale;

        return (
          <Link
            key={candidate}
            href={switchLocalePath(pathname, candidate)}
            // The switcher's own label is in the target language, so it must
            // be marked as such or a screen reader will read "Français" with
            // an English voice (PRD 17.1 "language changes identified").
            lang={candidate}
            hrefLang={candidate}
            aria-current={isCurrent ? 'true' : undefined}
            className={
              isCurrent
                ? 'rounded px-2 py-1 text-sm font-semibold text-[var(--color-navy)] underline underline-offset-4'
                : 'rounded px-2 py-1 text-sm text-[var(--color-slate)] hover:text-[var(--color-navy)] hover:underline hover:underline-offset-4'
            }
          >
            {LOCALE_LABELS[candidate]}
          </Link>
        );
      })}
    </nav>
  );
}
