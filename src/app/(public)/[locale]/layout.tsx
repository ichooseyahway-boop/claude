import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import '../../globals.css';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import {
  LOCALES,
  htmlLang,
  localeFromSegment,
  segmentFromLocale,
} from '@/lib/i18n';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale: segmentFromLocale(locale) }));
}

/**
 * Root layout for the public site.
 *
 * This is a *root* layout — it renders `<html>` and `<body>` — because that is
 * the only element WCAG 3.1.1 accepts for the page language. Setting `lang` on
 * an inner `<div>` satisfies 3.1.2 (Language of Parts) and leaves 3.1.1 unmet,
 * which means a screen reader announces the whole French site with English
 * pronunciation. Multiple root layouts (see the sibling route groups) are what
 * make a correct `lang` possible without forcing every page to render
 * dynamically.
 *
 * An unknown locale segment 404s rather than falling back to English, so a
 * broken link is visible instead of silently serving the wrong language.
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
    <html lang={htmlLang(locale)} suppressHydrationWarning>
      <body>
        <SiteHeader locale={locale} />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
