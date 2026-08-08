import { enCA, type Messages } from './messages/en-CA';
import { frCA } from './messages/fr-CA';
import { DEFAULT_LOCALE, type Locale } from './locales';

export type { Messages };
export * from './locales';
export * from './format';
export { interpolate } from './interpolate';

const CATALOGS: Record<Locale, Messages> = {
  'en-CA': enCA,
  'fr-CA': frCA,
};

/**
 * Resolve the message catalog for a locale.
 *
 * There is deliberately no per-key fallback to English. FR-I18N-001 requires
 * that "Content fallback must never silently display draft English", and the
 * catalogs are type-checked to be structurally identical, so a fallback path
 * could only ever mask a bug.
 */
export function getMessages(locale: Locale): Messages {
  return CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
}
