/**
 * Locale definitions.
 *
 * PRD refs: FR-I18N-001 (locale architecture), section 2.2 (bilingual at
 * launch using `en-CA` and `fr-CA`).
 *
 * Locale codes are the full BCP-47 Canadian tags because Canadian French and
 * Canadian English differ from `fr-FR` / `en-US` in date, currency and
 * terminology conventions. Do not shorten these to `en` / `fr`.
 */
export const LOCALES = ['en-CA', 'fr-CA'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en-CA';

/** Short segment used in URLs: /en/pricing, /fr/tarifs-equivalent-route. */
export const LOCALE_SEGMENTS: Record<Locale, string> = {
  'en-CA': 'en',
  'fr-CA': 'fr',
};

const SEGMENT_TO_LOCALE: Record<string, Locale> = {
  en: 'en-CA',
  fr: 'fr-CA',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Resolve a URL segment (`en` / `fr`) to a full locale, or null. */
export function localeFromSegment(segment: string): Locale | null {
  return SEGMENT_TO_LOCALE[segment] ?? null;
}

export function segmentFromLocale(locale: Locale): string {
  return LOCALE_SEGMENTS[locale];
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en-CA' ? 'fr-CA' : 'en-CA';
}

/**
 * HTML `lang` attribute value. Identical to the locale code, but exposed as a
 * function so a future locale with a different presentation tag does not force
 * changes at every call site (WCAG 3.1.1 Language of Page).
 */
export function htmlLang(locale: Locale): string {
  return locale;
}

/**
 * Build a locale-prefixed application path.
 *
 * `path` is the locale-independent route ("/pricing"). Language switching
 * preserves the equivalent route (FR-MKT-001 acceptance criteria), which is why
 * routes are keyed by a shared canonical path rather than translated slugs.
 */
export function localizedPath(locale: Locale, path = '/'): string {
  const normalized = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `/${segmentFromLocale(locale)}${normalized}`;
}
