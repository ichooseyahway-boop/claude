import { NextResponse, type NextRequest } from 'next/server';

import { DEFAULT_LOCALE, isLocale, LOCALES, negotiateLocale } from '@/lib/i18n/config';

/**
 * Locale routing and per-request CSP nonce.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; this is that
 * file, and the behaviour is unchanged.
 *
 * Two jobs:
 *
 * 1. Every public page lives under `/{locale}`. A request without one is
 *    redirected to the visitor's negotiated locale (FR-I18N-001), and their
 *    choice is remembered so the next visit does not re-negotiate.
 * 2. A fresh CSP nonce per request, so `script-src` never needs
 *    `'unsafe-inline'` (PRD 16.1).
 */

const LOCALE_COOKIE = 'botassure_locale';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Paths that are not locale-prefixed. */
const LOCALE_EXEMPT_PREFIXES = [
  '/api',
  '/app',
  '/ops',
  '/_next',
  '/status',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  if (LOCALE_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const firstSegment = pathname.split('/')[1] ?? '';

  if (isLocale(firstSegment)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });

    // Remember the locale the visitor is actually reading, so a later visit to
    // "/" lands where they left off rather than back on Accept-Language.
    if (request.cookies.get(LOCALE_COOKIE)?.value !== firstSegment) {
      response.cookies.set(LOCALE_COOKIE, firstSegment, {
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: 'lax',
        path: '/',
        httpOnly: false,
      });
    }

    return response;
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale !== undefined && isLocale(cookieLocale)
      ? cookieLocale
      : negotiateLocale(request.headers.get('accept-language'));

  const target = request.nextUrl.clone();
  target.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;

  return NextResponse.redirect(target);
}

export const config = {
  /*
   * Everything except Next internals and static files. The negative lookahead
   * keeps the middleware off asset requests, which would otherwise pay the
   * nonce-generation cost on every image.
   */
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'],
};

export { LOCALE_COOKIE, LOCALES, DEFAULT_LOCALE };
