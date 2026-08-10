import type { NextConfig } from 'next';

import {
  NO_INDEX_PATH_PREFIXES,
  noIndexHeaders,
  securityHeaders,
} from './src/lib/security/headers';

/**
 * Next.js configuration.
 *
 * PRD 16.1 requires a Content Security Policy and the standard hardening
 * headers on every response. They are defined once in
 * `src/lib/security/headers.ts` so the same list can be asserted by the
 * security test suite (PRD 20.3).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // PRD 1.1 rule 1: the production build must not succeed while type errors
  // exist. Linting is a separate CI step (`npm run lint`, PRD 21.1 step 3);
  // Next 16 no longer runs ESLint as part of `next build`.
  typescript: { ignoreBuildErrors: false },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders() },
      // Authenticated and API surfaces are never crawlable (FR-RPT-005).
      ...NO_INDEX_PATH_PREFIXES.map((prefix) => ({
        source: `${prefix}/:path*`,
        headers: noIndexHeaders(),
      })),
    ];
  },
};

export default nextConfig;
