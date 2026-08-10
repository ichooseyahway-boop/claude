import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { SiteFooter, SiteHeader } from '@/components/marketing/SiteChrome';
import { getMessages } from '@/lib/i18n';
import { HTML_LANG, isLocale, LOCALES, type Locale } from '@/lib/i18n/config';

/**
 * Locale layout.
 *
 * Sets the document language, renders the shared chrome, and provides the skip
 * link that PRD 17.1 requires as the first focusable element on every page.
 */

export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = getMessages(locale);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return {
    metadataBase: new URL(baseUrl),
    title: { default: messages.common.brandName, template: `%s · ${messages.common.brandName}` },
    // FR-MKT-001: hreflang for both locales plus an x-default.
    alternates: {
      languages: {
        'en-CA': `${baseUrl}/en-CA`,
        'fr-CA': `${baseUrl}/fr-CA`,
        'x-default': `${baseUrl}/en-CA`,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // An unknown locale is a 404, not a silent fallback to English.
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);

  return (
    <html lang={HTML_LANG[locale]}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          {messages.common.skipToContent}
        </a>

        <SiteHeader locale={locale} messages={messages} pathAfterLocale="" />

        <main id="main" className="flex-1">
          {children}
        </main>

        <SiteFooter locale={locale} messages={messages} />
      </body>
    </html>
  );
}
