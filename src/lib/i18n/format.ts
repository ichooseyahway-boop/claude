import type { Locale } from './locales';

/**
 * Locale-aware formatting helpers.
 *
 * PRD ref: FR-I18N-001 — "Format dates, currency, numbers and plurals by
 * locale." All money is CAD at launch (section 6: "Display CAD by default").
 */

export const DEFAULT_CURRENCY = 'CAD';

export function formatCurrency(
  amountMinorUnits: number,
  locale: Locale,
  currency: string = DEFAULT_CURRENCY,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // Canadian pricing is quoted in whole dollars at launch; fractional cents
    // still render correctly when a package uses them.
    minimumFractionDigits: amountMinorUnits % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinorUnits / 100);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(value: Date | string, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDateTime(value: Date | string, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100);
}
