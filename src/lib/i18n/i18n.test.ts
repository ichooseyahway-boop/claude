import { describe, expect, it } from 'vitest';
import { enCA } from './messages/en-CA';
import { frCA } from './messages/fr-CA';
import {
  DEFAULT_LOCALE,
  LOCALES,
  getMessages,
  isLocale,
  localeFromSegment,
  localizedPath,
  otherLocale,
} from './index';
import { formatCurrency, formatDate, formatNumber } from './format';
import { interpolate } from './interpolate';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/**
 * Structural key paths, used to prove both catalogs describe the same UI.
 * Array *contents* are compared by length as well, because a missing bullet in
 * a French list is exactly the kind of partial translation FR-I18N-001 forbids.
 */
function keyPaths(value: Json, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return [
      `${prefix}[]:${value.length}`,
      ...value.flatMap((item, index) =>
        keyPaths(item as Json, `${prefix}[${index}]`),
      ),
    ];
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .flatMap((key) =>
        keyPaths(
          (value as Record<string, Json>)[key] as Json,
          prefix ? `${prefix}.${key}` : key,
        ),
      );
  }
  return [prefix];
}

function leafStrings(value: Json, prefix = ''): Array<[string, string]> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      leafStrings(item as Json, `${prefix}[${index}]`),
    );
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      leafStrings(item as Json, prefix ? `${prefix}.${key}` : key),
    );
  }
  return typeof value === 'string' ? [[prefix, value]] : [];
}

describe('locale helpers', () => {
  it('exposes exactly the two Canadian launch locales', () => {
    expect(LOCALES).toEqual(['en-CA', 'fr-CA']);
    expect(DEFAULT_LOCALE).toBe('en-CA');
  });

  it('maps URL segments to locales and back', () => {
    expect(localeFromSegment('en')).toBe('en-CA');
    expect(localeFromSegment('fr')).toBe('fr-CA');
    expect(localeFromSegment('de')).toBeNull();
    expect(localeFromSegment('en-CA')).toBeNull();
  });

  it('rejects non-launch locales', () => {
    expect(isLocale('en-CA')).toBe(true);
    expect(isLocale('fr-FR')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('preserves the equivalent route when switching language', () => {
    // FR-MKT-001: "Language switching preserves the equivalent route."
    expect(localizedPath('fr-CA', '/pricing')).toBe('/fr/pricing');
    expect(localizedPath('en-CA', '/pricing')).toBe('/en/pricing');
    expect(localizedPath('fr-CA', '/')).toBe('/fr');
    expect(localizedPath('fr-CA', 'legal/terms')).toBe('/fr/legal/terms');
    expect(otherLocale('en-CA')).toBe('fr-CA');
    expect(otherLocale('fr-CA')).toBe('en-CA');
  });
});

describe('message catalogs', () => {
  it('French has no missing or extra keys (zero missing keys at launch)', () => {
    // PRD 26.3: "French missing-key count: zero at launch."
    const english = keyPaths(enCA as unknown as Json);
    const french = keyPaths(frCA as unknown as Json);

    const missingInFrench = english.filter((k) => !french.includes(k));
    const extraInFrench = french.filter((k) => !english.includes(k));

    expect(missingInFrench).toEqual([]);
    expect(extraInFrench).toEqual([]);
  });

  it('contains no empty or placeholder strings in either locale', () => {
    for (const [locale, catalog] of [
      ['en-CA', enCA],
      ['fr-CA', frCA],
    ] as const) {
      for (const [path, value] of leafStrings(catalog as unknown as Json)) {
        expect(value.trim(), `${locale} ${path} is empty`).not.toBe('');
        expect(
          value,
          `${locale} ${path} contains an untranslated placeholder`,
        ).not.toMatch(/\b(TODO|TBD|FIXME|Lorem ipsum|XXX)\b/i);
      }
    }
  });

  it('does not ship French copy that is byte-identical to English prose', () => {
    // Catches a translation that was skipped by copy-pasting the English.
    // Proper nouns and short shared tokens (FAQ, Contact) are legitimately
    // identical, so only sentence-length strings are compared.
    const english = new Map(leafStrings(enCA as unknown as Json));
    const french = new Map(leafStrings(frCA as unknown as Json));

    const untranslated: string[] = [];
    for (const [path, englishValue] of english) {
      const frenchValue = french.get(path);
      if (
        frenchValue !== undefined &&
        englishValue.length > 40 &&
        frenchValue === englishValue
      ) {
        untranslated.push(path);
      }
    }
    expect(untranslated).toEqual([]);
  });

  it('keeps interpolation placeholders consistent across locales', () => {
    const placeholders = (s: string) =>
      (s.match(/\{(\w+)\}/g) ?? []).sort().join(',');
    const english = new Map(leafStrings(enCA as unknown as Json));
    const french = new Map(leafStrings(frCA as unknown as Json));

    for (const [path, englishValue] of english) {
      const frenchValue = french.get(path);
      if (frenchValue === undefined) continue;
      expect(placeholders(frenchValue), `placeholders differ at ${path}`).toBe(
        placeholders(englishValue),
      );
    }
  });

  it('avoids prohibited marketing claims in both locales', () => {
    // PRD 4.4: prohibited message territory.
    const prohibited = [
      /guaranteed compliant/i,
      /eliminates all (ai )?risk/i,
      /government approved/i,
      /certified safe/i,
      /garantie? de conformité/i,
      /élimine tous les risques/i,
      /approuvé par le gouvernement/i,
    ];

    for (const catalog of [enCA, frCA]) {
      for (const [path, value] of leafStrings(catalog as unknown as Json)) {
        for (const pattern of prohibited) {
          expect(value, `${path} uses prohibited claim ${pattern}`).not.toMatch(
            pattern,
          );
        }
      }
    }
  });

  it('resolves a catalog for every locale', () => {
    for (const locale of LOCALES) {
      expect(getMessages(locale).nav.home.length).toBeGreaterThan(0);
    }
  });
});

describe('formatting', () => {
  it('formats CAD amounts per locale', () => {
    // Amounts are stored in minor units (cents).
    expect(formatCurrency(49500, 'en-CA')).toContain('495');
    expect(formatCurrency(49500, 'fr-CA')).toContain('495');
    // French Canadian uses a non-breaking space before the currency symbol.
    expect(formatCurrency(49500, 'fr-CA')).toMatch(/\$/);
  });

  it('formats numbers and dates per locale', () => {
    expect(formatNumber(1000, 'en-CA')).toBe('1,000');
    const date = new Date('2026-08-08T00:00:00Z');
    expect(formatDate(date, 'en-CA')).toContain('2026');
    expect(formatDate(date, 'fr-CA')).toContain('2026');
    expect(formatDate(date, 'en-CA')).not.toBe(formatDate(date, 'fr-CA'));
  });
});

describe('interpolate', () => {
  it('substitutes known placeholders', () => {
    expect(interpolate('Contact {brand} today', { brand: 'Acme' })).toBe(
      'Contact Acme today',
    );
  });

  it('leaves unknown placeholders visible rather than printing undefined', () => {
    expect(interpolate('Hello {missing}', {})).toBe('Hello {missing}');
  });
});
