/**
 * Locale configuration (PRD FR-I18N-001).
 *
 * Two locales, both first-class. PRD 17.2 states the principle plainly:
 * "French is not a secondary afterthought." The type system enforces it — a
 * message key that exists in English and not in French is a compile error, so
 * a French page cannot silently fall back to English text.
 */

export const LOCALES = ['en-CA', 'fr-CA'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en-CA';

/** Language subtag for the `lang` attribute (PRD 17.1). */
export const HTML_LANG: Readonly<Record<Locale, string>> = Object.freeze({
  'en-CA': 'en-CA',
  'fr-CA': 'fr-CA',
});

/** How each locale names itself, for the language switcher. */
export const LOCALE_LABELS: Readonly<Record<Locale, string>> = Object.freeze({
  'en-CA': 'English',
  'fr-CA': 'Français',
});

/** `hreflang` values, including the x-default pointing at the default locale. */
export const HREFLANG: Readonly<Record<Locale | 'x-default', string>> = Object.freeze({
  'en-CA': 'en-CA',
  'fr-CA': 'fr-CA',
  'x-default': 'en-CA',
});

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best locale from an `Accept-Language` header.
 *
 * Deliberately simple: quality-value ordering, then a language-subtag match so
 * `fr`, `fr-FR` and `fr-CA` all land on `fr-CA`. A Canadian French speaker
 * whose browser says `fr-FR` should not get English.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const qParam = params.find((param) => param.trim().startsWith('q='));
      const quality = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '1') : 1;

      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag !== '' && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const entry of ranked) {
    if (entry.tag === 'fr-ca') return 'fr-CA';
    if (entry.tag === 'en-ca') return 'en-CA';
    if (entry.tag.startsWith('fr')) return 'fr-CA';
    if (entry.tag.startsWith('en')) return 'en-CA';
  }

  return DEFAULT_LOCALE;
}

/**
 * Swaps the locale segment of a path, preserving the rest of the route.
 *
 * FR-MKT-001 requires language switching to preserve the equivalent route —
 * dropping a visitor on the home page when they switch language is the exact
 * failure this prevents.
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const segments = pathname.split('/').filter((segment) => segment !== '');
  const first = segments[0];

  if (first !== undefined && isLocale(first)) {
    segments[0] = target;
    return `/${segments.join('/')}`;
  }

  return `/${[target, ...segments].join('/')}`;
}
