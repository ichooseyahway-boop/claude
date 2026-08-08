import type { Messages } from '@/lib/i18n';

/**
 * Public route map.
 *
 * PRD ref: section 11.1 / 11.2.
 *
 * Paths are locale-independent and prefixed at render time, which is what makes
 * "language switching preserves the equivalent route" (FR-MKT-001) a property
 * of the system rather than a per-page reminder.
 */

export interface PublicRoute {
  /** Locale-independent path, without the locale prefix. */
  path: string;
  /** Resolver for the localized nav label. */
  label: (m: Messages) => string;
  /** Show in the primary header navigation. */
  inHeader: boolean;
  /** Footer grouping. */
  footerGroup: 'product' | 'company' | 'legal' | null;
}

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: '/', label: (m) => m.nav.home, inHeader: false, footerGroup: null },
  {
    path: '/how-it-works',
    label: (m) => m.nav.howItWorks,
    inHeader: true,
    footerGroup: 'product',
  },
  {
    path: '/methodology',
    label: (m) => m.nav.methodology,
    inHeader: true,
    footerGroup: 'product',
  },
  {
    path: '/pricing',
    label: (m) => m.nav.pricing,
    inHeader: true,
    footerGroup: 'product',
  },
  {
    path: '/sample-report',
    label: (m) => m.nav.sampleReport,
    inHeader: true,
    footerGroup: 'product',
  },
  {
    path: '/security',
    label: (m) => m.nav.security,
    inHeader: true,
    footerGroup: 'product',
  },
  {
    path: '/about',
    label: (m) => m.nav.about,
    inHeader: false,
    footerGroup: 'company',
  },
  {
    path: '/contact',
    label: (m) => m.nav.contact,
    inHeader: false,
    footerGroup: 'company',
  },
  {
    path: '/book',
    label: (m) => m.common.bookCall,
    inHeader: false,
    footerGroup: 'company',
  },
  {
    path: '/faq',
    label: (m) => m.nav.faq,
    inHeader: false,
    footerGroup: 'company',
  },
  {
    path: '/legal/terms',
    label: (m) => m.footer.terms,
    inHeader: false,
    footerGroup: 'legal',
  },
  {
    path: '/legal/privacy',
    label: (m) => m.footer.privacy,
    inHeader: false,
    footerGroup: 'legal',
  },
  {
    path: '/legal/acceptable-use',
    label: (m) => m.footer.acceptableUse,
    inHeader: false,
    footerGroup: 'legal',
  },
  {
    path: '/legal/refunds',
    label: (m) => m.footer.refunds,
    inHeader: false,
    footerGroup: 'legal',
  },
  {
    path: '/legal/cookies',
    label: (m) => m.footer.cookies,
    inHeader: false,
    footerGroup: 'legal',
  },
];

export const HEADER_ROUTES = PUBLIC_ROUTES.filter((r) => r.inHeader);

export function footerRoutes(
  group: NonNullable<PublicRoute['footerGroup']>,
): PublicRoute[] {
  return PUBLIC_ROUTES.filter((r) => r.footerGroup === group);
}

/** Legal documents, keyed by their route segment. */
export const LEGAL_DOCUMENTS = [
  'terms',
  'privacy',
  'acceptable-use',
  'refunds',
  'cookies',
] as const;

export type LegalDocumentSlug = (typeof LEGAL_DOCUMENTS)[number];

export function isLegalDocumentSlug(
  value: unknown,
): value is LegalDocumentSlug {
  return (
    typeof value === 'string' &&
    (LEGAL_DOCUMENTS as readonly string[]).includes(value)
  );
}

/** Maps a legal route segment to its key in the message catalog. */
export const LEGAL_MESSAGE_KEY: Record<
  LegalDocumentSlug,
  'terms' | 'privacy' | 'acceptableUse' | 'refunds' | 'cookies'
> = {
  terms: 'terms',
  privacy: 'privacy',
  'acceptable-use': 'acceptableUse',
  refunds: 'refunds',
  cookies: 'cookies',
};
