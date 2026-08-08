import { notFound } from 'next/navigation';
import { getMessages, localeFromSegment, type Locale, type Messages } from './index';

/**
 * Resolve the locale for a page from its route params.
 *
 * An unrecognized segment 404s rather than falling back to English, so a bad
 * link surfaces as a broken page instead of quietly serving the wrong language
 * (FR-I18N-001).
 */
export async function resolvePageLocale(
  params: Promise<{ locale: string }>,
): Promise<{ locale: Locale; m: Messages }> {
  const { locale: segment } = await params;
  const locale = localeFromSegment(segment);
  if (!locale) notFound();
  return { locale, m: getMessages(locale) };
}
