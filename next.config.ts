import type { NextConfig } from "next";

/**
 * Security headers applied to every response. These are intentionally strict:
 * School Inbox handles family information, so defence-in-depth starts at the edge.
 * The Content-Security-Policy is deliberately conservative — no third-party
 * script hosts are allowed by default. Stripe Checkout is a hosted redirect, so
 * we do not need to embed Stripe.js in Release 0.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
