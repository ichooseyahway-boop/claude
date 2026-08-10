/**
 * Security response headers (PRD 16.1, PRD 20.3).
 *
 * Defined in one place so `next.config.ts` and the security test suite assert
 * the exact same list. Changing a header here changes it everywhere.
 */

export interface SecurityHeader {
  readonly key: string;
  readonly value: string;
}

/**
 * Content Security Policy directives.
 *
 * `'unsafe-inline'` is deliberately NOT granted to `script-src`. Next.js
 * inline bootstrap scripts are covered by the per-request nonce that
 * `middleware.ts` injects; `'strict-dynamic'` then extends trust to the
 * chunks those scripts load.
 *
 * `style-src` does allow `'unsafe-inline'`: React inlines style attributes for
 * things like the score ring, and there is no XSS-meaningful sink there. This
 * is a documented, bounded exception rather than an oversight.
 */
function contentSecurityPolicy(nonce: string | undefined): string {
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : // Build-time/static fallback used when no nonce is available.
      `'self'`;

  const directives: Record<string, string> = {
    'default-src': `'self'`,
    'script-src': scriptSrc,
    'style-src': `'self' 'unsafe-inline'`,
    // Self-hosted fonts only. PRD 17.3 forbids depending on a third-party font
    // host that creates privacy or performance problems.
    'font-src': `'self'`,
    'img-src': `'self' data: blob:`,
    // No third-party origins by default. Analytics and error monitoring hosts
    // are appended at deploy time from configuration, not hard-coded here.
    'connect-src': `'self'`,
    // The application never embeds third-party frames, and must never be
    // embedded itself.
    'frame-src': `'none'`,
    'frame-ancestors': `'none'`,
    'object-src': `'none'`,
    'base-uri': `'self'`,
    'form-action': `'self'`,
    'worker-src': `'self' blob:`,
    'manifest-src': `'self'`,
    'upgrade-insecure-requests': '',
  };

  return Object.entries(directives)
    .map(([directive, value]) => (value === '' ? directive : `${directive} ${value}`))
    .join('; ');
}

/**
 * The full header set applied to every response.
 *
 * @param nonce Per-request CSP nonce. Omitted for the static config fallback.
 */
export function securityHeaders(nonce?: string): SecurityHeader[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(nonce) },
    // Two years, subdomains included. Only meaningful over HTTPS.
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // The product needs none of these capabilities. Denying them limits the
    // damage of any future injected script.
    {
      key: 'Permissions-Policy',
      value: [
        'accelerometer=()',
        'camera=()',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'microphone=()',
        'payment=()',
        'usb=()',
        'interest-cohort=()',
      ].join(', '),
    },
    // Reports and evidence must not be readable by a cross-origin document.
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ];
}

/**
 * Route prefixes that must never be indexed by a search engine.
 *
 * FR-RPT-005 forbids public search indexing of report content, and no
 * authenticated surface should be crawlable. This is deliberately NOT part of
 * `securityHeaders()`: the marketing site must stay indexable, because
 * FR-MKT-001 requires canonical and hreflang handling to work.
 */
export const NO_INDEX_PATH_PREFIXES = ['/app', '/ops', '/api'] as const;

/** `X-Robots-Tag` applied only to the prefixes above. */
export function noIndexHeaders(): SecurityHeader[] {
  return [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }];
}

/** Header keys only, for assertions and documentation. */
export function securityHeaderKeys(): string[] {
  return securityHeaders().map((header) => header.key);
}
