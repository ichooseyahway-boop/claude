import type { Metadata } from 'next';
import { brand } from '@/config/brand';
import { LOCALES, getMessages, localizedPath, type Locale } from '@/lib/i18n';

/**
 * Per-page metadata.
 *
 * PRD ref: FR-MKT-001 — "Every page has language-specific metadata, canonical
 * rules and `hreflang` values."
 *
 * `path` is the locale-independent route, so the alternates map is derived
 * rather than hand-maintained per page.
 */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  noIndex = false,
}: {
  locale: Locale;
  path: string;
  title: string;
  description?: string;
  noIndex?: boolean;
}): Metadata {
  const m = getMessages(locale);
  const resolvedDescription = description ?? m.meta.defaultDescription;
  const canonical = `${brand.siteUrl}${localizedPath(locale, path)}`;

  const languages: Record<string, string> = {};
  for (const alternate of LOCALES) {
    languages[alternate] = `${brand.siteUrl}${localizedPath(alternate, path)}`;
  }
  // x-default points at the default locale so search engines have a fallback
  // for users whose language matches neither Canadian locale.
  languages['x-default'] = `${brand.siteUrl}${localizedPath('en-CA', path)}`;

  return {
    title: `${title} | ${brand.name}`,
    description: resolvedDescription,
    metadataBase: new URL(brand.siteUrl),
    alternates: { canonical, languages },
    openGraph: {
      title: `${title} | ${brand.name}`,
      description: resolvedDescription,
      url: canonical,
      siteName: brand.name,
      locale,
      type: 'website',
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
