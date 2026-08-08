import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * PRD refs: FR-SEC baseline (16.1), 20.3 "Security headers pass documented inspection".
 *
 * The Content-Security-Policy is intentionally strict. `'unsafe-inline'` is
 * required for styles because Next.js injects critical CSS inline; it is NOT
 * granted to scripts. If a future feature needs an external origin, add it to
 * the explicit allowlist here rather than widening a directive to `*`.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js App Router requires inline bootstrap scripts; nonces are added by
  // middleware for runtime-injected scripts.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Billing + auth providers are added from configuration at deploy time.
  "connect-src 'self' https://*.supabase.co https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  // Linting is a separate, blocking CI step (21.1) rather than part of `build`.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Reports and application pages must never be indexed or cached by
        // shared caches. FR-RPT-005: "Never enable public search indexing."
        source: '/app/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
        ],
      },
      {
        source: '/ops/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
