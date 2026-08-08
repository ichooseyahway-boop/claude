/**
 * Brand configuration.
 *
 * PRD ref: "IMPORTANT BRAND NOTE: 'BotAssure CX' is a working name... Keep the
 * brand name, logo, colours, support email and domain configurable."
 *
 * Every brand value is read from environment configuration with a working-name
 * default so that a rename before launch is a deployment change, not a code
 * change. Nothing in `src/` may hard-code the product name.
 */

export interface BrandConfig {
  /** Product/service name shown in UI, emails and reports. */
  name: string;
  /** Legal entity name shown in legal documents and invoices. */
  legalName: string;
  tagline: { 'en-CA': string; 'fr-CA': string };
  supportEmail: string;
  privacyEmail: string;
  securityEmail: string;
  /** Absolute site origin, e.g. https://example.ca — no trailing slash. */
  siteUrl: string;
  /** Set true only after professional trademark/domain clearance (23.2). */
  nameClearanceCompleted: boolean;
}

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

export const brand: BrandConfig = {
  name: env('NEXT_PUBLIC_BRAND_NAME', 'BotAssure CX'),
  legalName: env('NEXT_PUBLIC_BRAND_LEGAL_NAME', 'BotAssure CX (working name)'),
  tagline: {
    'en-CA': 'Find the failures before your customers do.',
    'fr-CA': 'Trouvez les défaillances avant vos clients.',
  },
  supportEmail: env('NEXT_PUBLIC_SUPPORT_EMAIL', 'support@example.ca'),
  privacyEmail: env('NEXT_PUBLIC_PRIVACY_EMAIL', 'privacy@example.ca'),
  securityEmail: env('NEXT_PUBLIC_SECURITY_EMAIL', 'security@example.ca'),
  siteUrl: env('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000').replace(
    /\/+$/,
    '',
  ),
  nameClearanceCompleted:
    env('BRAND_NAME_CLEARANCE_COMPLETED', 'false') === 'true',
};
