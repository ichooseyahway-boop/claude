'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  localeFromSegment,
  localizedPath,
  otherLocale,
  type Locale,
} from '@/lib/i18n';

/**
 * Language switcher.
 *
 * PRD ref: FR-MKT-001 — "Language switching preserves the equivalent route."
 *
 * This is the one client component on the public site. It needs the current
 * pathname to build the equivalent route in the other locale, and reading it on
 * the client keeps every page statically renderable; deriving it from a request
 * header would opt the whole marketing site into dynamic rendering.
 */
export function LanguageSwitcher({
  locale,
  label,
  ariaLabel,
}: {
  locale: Locale;
  label: string;
  ariaLabel: string;
}) {
  const pathname = usePathname() ?? '/';
  const target = otherLocale(locale);

  // "/en/legal/terms" -> "/legal/terms"
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  const rest =
    first !== undefined && localeFromSegment(first) !== null
      ? segments.slice(1)
      : segments;
  const localeIndependentPath = rest.length === 0 ? '/' : `/${rest.join('/')}`;

  return (
    <Link
      href={localizedPath(target, localeIndependentPath)}
      hrefLang={target}
      lang={target}
      className="text-sm underline underline-offset-4"
      aria-label={ariaLabel}
    >
      {label}
    </Link>
  );
}
