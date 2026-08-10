import { describe, expect, it } from 'vitest';

import { isLocale, LOCALES, negotiateLocale, switchLocalePath } from './config';
import { formatCurrency, formatDate, formatScore, getMessages } from './index';
import { enCA } from './messages/en-CA';
import { frCA } from './messages/fr-CA';

/** Recursively collects every leaf path in a message catalogue. */
function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leafPaths(item, `${prefix}[${index}]`));
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      leafPaths(item, prefix === '' ? key : `${prefix}.${key}`),
    );
  }

  return [prefix];
}

/** Collects every leaf string value, for the "still in English" scan. */
function leafValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(leafValues);

  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(leafValues);
  }

  return typeof value === 'string' ? [value] : [];
}

describe('catalogue completeness (FR-I18N-001, launch gate 23.4)', () => {
  it('has the identical key set in both locales', () => {
    const english = leafPaths(enCA).sort();
    const french = leafPaths(frCA).sort();

    // The launch gate requires a French missing-key count of zero.
    expect(french).toEqual(english);
  });

  it('has no empty string in either catalogue', () => {
    for (const [name, catalogue] of [
      ['en-CA', enCA],
      ['fr-CA', frCA],
    ] as const) {
      const empty = leafValues(catalogue).filter((value) => value.trim() === '');
      expect(empty, `${name} contains an empty message`).toHaveLength(0);
    }
  });

  it('has no untranslated placeholder markers', () => {
    // Catches "TODO", "TBD", "[FR]", "XXX" left behind in either catalogue.
    const suspicious = /\b(TODO|TBD|FIXME|XXX|LOREM)\b|\[(?:FR|EN|TRANSLATE)\]/i;

    for (const [name, catalogue] of [
      ['en-CA', enCA],
      ['fr-CA', frCA],
    ] as const) {
      const flagged = leafValues(catalogue).filter((value) => suspicious.test(value));
      expect(flagged, `${name} contains a placeholder marker`).toEqual([]);
    }
  });

  it('does not leave English copy sitting in the French catalogue', () => {
    // The exact failure FR-I18N-001 names: a released French page showing
    // English draft text. Brand names and shared tokens are expected to match.
    const shared = new Set(['BotAssure CX', '1', '2', '3']);

    const paths = leafPaths(enCA);
    const englishValues = leafValues(enCA);
    const frenchValues = leafValues(frCA);

    const identical = paths.filter((_path, index) => {
      const englishValue = englishValues[index];
      const frenchValue = frenchValues[index];

      if (englishValue === undefined || frenchValue === undefined) return false;
      if (shared.has(englishValue)) return false;
      // Short strings can legitimately coincide across languages.
      if (englishValue.length < 12) return false;

      return englishValue === frenchValue;
    });

    expect(identical).toEqual([]);
  });

  it('makes prohibited marketing claims impossible to ship unnoticed', () => {
    // PRD 4.4 prohibited message territory.
    const prohibited = [
      /\bguaranteed compliant\b/i,
      /\beliminates all\b.*\brisk\b/i,
      /\bgovernment approved\b/i,
      /\bcertified safe\b/i,
      /\bgarantie?\s+de\s+conformité\b/i,
      /\bapprouvé par le gouvernement\b/i,
    ];

    for (const [name, catalogue] of [
      ['en-CA', enCA],
      ['fr-CA', frCA],
    ] as const) {
      for (const value of leafValues(catalogue)) {
        for (const pattern of prohibited) {
          expect(pattern.test(value), `${name} makes a prohibited claim: "${value}"`).toBe(false);
        }
      }
    }
  });
});

describe('getMessages', () => {
  it('returns the right catalogue for each locale', () => {
    expect(getMessages('en-CA').nav.pricing).toBe('Pricing');
    expect(getMessages('fr-CA').nav.pricing).toBe('Tarifs');
  });

  it('covers every declared locale', () => {
    for (const locale of LOCALES) {
      expect(getMessages(locale).common.brandName).toBe('BotAssure CX');
    }
  });
});

describe('locale negotiation', () => {
  it('recognizes the two supported locales', () => {
    expect(isLocale('en-CA')).toBe(true);
    expect(isLocale('fr-CA')).toBe(true);
    expect(isLocale('es-MX')).toBe(false);
  });

  it('sends any French variant to Canadian French', () => {
    // A Quebec visitor whose browser reports fr-FR must not get English.
    expect(negotiateLocale('fr-FR,fr;q=0.9')).toBe('fr-CA');
    expect(negotiateLocale('fr')).toBe('fr-CA');
    expect(negotiateLocale('fr-CA')).toBe('fr-CA');
  });

  it('respects quality ordering rather than header order', () => {
    expect(negotiateLocale('en;q=0.5,fr;q=0.9')).toBe('fr-CA');
  });

  it('ignores a zero-quality entry', () => {
    expect(negotiateLocale('fr;q=0,en;q=0.8')).toBe('en-CA');
  });

  it('falls back to the default for an absent or unknown header', () => {
    expect(negotiateLocale(null)).toBe('en-CA');
    expect(negotiateLocale('de-DE,ja')).toBe('en-CA');
  });
});

describe('switchLocalePath (FR-MKT-001)', () => {
  it('preserves the equivalent route when switching language', () => {
    expect(switchLocalePath('/en-CA/pricing', 'fr-CA')).toBe('/fr-CA/pricing');
    expect(switchLocalePath('/fr-CA/legal/terms', 'en-CA')).toBe('/en-CA/legal/terms');
  });

  it('adds a locale to a path that has none', () => {
    expect(switchLocalePath('/pricing', 'fr-CA')).toBe('/fr-CA/pricing');
  });

  it('handles the root path', () => {
    expect(switchLocalePath('/', 'fr-CA')).toBe('/fr-CA');
    expect(switchLocalePath('/en-CA', 'fr-CA')).toBe('/fr-CA');
  });
});

describe('locale-aware formatting', () => {
  it('formats currency in each locale', () => {
    const english = formatCurrency(175_000, 'en-CA');
    const french = formatCurrency(175_000, 'fr-CA');

    expect(english).toContain('1,750');
    // French Canadian uses a space as the group separator and a trailing $.
    expect(french).toMatch(/1\s?750/);
    expect(french.trimEnd().endsWith('$')).toBe(true);
  });

  it('can hide decimals on a whole amount', () => {
    expect(formatCurrency(49_500, 'en-CA', 'CAD', { hideDecimalsWhenWhole: true })).not.toContain(
      '.00',
    );
    expect(formatCurrency(49_550, 'en-CA', 'CAD', { hideDecimalsWhenWhole: true })).toContain(
      '.50',
    );
  });

  it('formats a score with one decimal place', () => {
    expect(formatScore(72, 'en-CA')).toBe('72.0');
    expect(formatScore(72, 'fr-CA')).toBe('72,0');
  });

  it('formats dates in the requested time zone, not the server default', () => {
    // 03:00 UTC is still the previous day in Toronto.
    const formatted = formatDate('2026-08-11T03:00:00Z', 'en-CA', 'America/Toronto');
    expect(formatted).toContain('August 10');
  });

  it('formats dates in French', () => {
    expect(formatDate('2026-08-10T15:00:00Z', 'fr-CA')).toContain('août');
  });
});
