import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { LOCALES, htmlLang, localeFromSegment, segmentFromLocale } from '@/lib/i18n';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale: segmentFromLocale(locale) }));
}

/**
 * Locale layout.
 *
 * Sets the document language (WCAG 3.1.1) and wraps every public page in the
 * shared header and footer. An unknown locale segment 404s rather than falling
 * back to English, so a broken link is visible instead of silently serving the
 * wrong language.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: segment } = await params;
  const locale = localeFromSegment(segment);
  if (!locale) notFound();

  return (
    <div lang={htmlLang(locale)}>
      <SiteHeader locale={locale} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale} />
    </div>
  );
}
