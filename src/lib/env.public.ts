/**
 * Browser-safe environment access. ONLY reads `NEXT_PUBLIC_*` variables, which
 * Next.js inlines at build time. Never import secrets here. Server code that
 * needs secrets uses `@/lib/env` instead.
 */

export const env = {
  appUrl(): string {
    const v = process.env.NEXT_PUBLIC_APP_URL;
    if (v && v.trim().length > 0) return v.trim().replace(/\/$/, "");
    return "http://localhost:3000";
  },
  analyticsEnabled(): boolean {
    return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  },
};
