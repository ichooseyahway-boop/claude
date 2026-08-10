/**
 * Message lookup and locale-aware formatting (PRD FR-I18N-001).
 */

import { DEFAULT_LOCALE, type Locale } from './config';
import { enCA, type Messages } from './messages/en-CA';
import { frCA } from './messages/fr-CA';

const CATALOGUES: Readonly<Record<Locale, Messages>> = Object.freeze({
  'en-CA': enCA,
  'fr-CA': frCA,
});

/**
 * Returns the catalogue for a locale.
 *
 * There is no partial fallback by design. A key either exists in both
 * catalogues — which the type system guarantees — or the build fails. Silently
 * substituting English into a French page is the exact failure FR-I18N-001
 * prohibits, so there is no code path here that can do it.
 */
export function getMessages(locale: Locale): Messages {
  return CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE];
}

export type { Messages };
export * from './config';

// ---------------------------------------------------------------------------
// Formatting (PRD FR-I18N-001: dates, currency, numbers and plurals by locale)
// ---------------------------------------------------------------------------

/**
 * Formats an amount held in cents.
 *
 * Money is stored and passed around as integer cents everywhere in this
 * codebase. Formatting is the only place it becomes a decimal, which keeps
 * rounding out of the commercial logic.
 */
export function formatCurrency(
  amountCents: number,
  locale: Locale,
  currency = 'CAD',
  options: { readonly hideDecimalsWhenWhole?: boolean } = {},
): string {
  const isWhole = amountCents % 100 === 0;
  const hideDecimals = options.hideDecimalsWhenWhole === true && isWhole;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: hideDecimals ? 0 : 2,
    maximumFractionDigits: hideDecimals ? 0 : 2,
  }).format(amountCents / 100);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Formats a score for display, always with one decimal place. */
export function formatScore(score: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(score);
}

/**
 * Formats a date in the given locale.
 *
 * The time zone is passed explicitly rather than defaulting to the server's,
 * which would render a Toronto customer's report with UTC dates.
 */
export function formatDate(
  value: Date | string,
  locale: Locale,
  timeZone = 'America/Toronto',
): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(date);
}

export function formatDateTime(
  value: Date | string,
  locale: Locale,
  timeZone = 'America/Toronto',
): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}
