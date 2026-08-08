import { z } from 'zod';

/**
 * Lead / contact form schema.
 *
 * PRD ref: FR-MKT-004 — "Validate on client and server", explicit consent text,
 * consent source/version/timestamp, spam prevention and rate limiting.
 *
 * The same schema runs in the browser and on the server, so a bypassed client
 * cannot submit a shape the server has not checked.
 */

export const CONSENT_DOCUMENT_VERSION = 'contact-consent@1.0.0';

/** Field limits, enforced on both sides and mirrored by DB check constraints. */
export const CONTACT_LIMITS = {
  name: 120,
  email: 254,
  organization: 160,
  role: 120,
  system: 500,
  languages: 120,
  message: 4000,
} as const;

export const ContactRequestSchema = z.object({
  name: z.string().trim().min(1).max(CONTACT_LIMITS.name),
  email: z.string().trim().toLowerCase().email().max(CONTACT_LIMITS.email),
  organization: z.string().trim().max(CONTACT_LIMITS.organization).optional(),
  role: z.string().trim().max(CONTACT_LIMITS.role).optional(),
  system: z.string().trim().max(CONTACT_LIMITS.system).optional(),
  languages: z.string().trim().max(CONTACT_LIMITS.languages).optional(),
  message: z.string().trim().min(1).max(CONTACT_LIMITS.message),
  /**
   * Required service consent. Must be explicitly true — FR-LEGAL-001 forbids
   * bundling optional marketing consent into required service acceptance, so
   * these are two separate fields that are stored as two separate records.
   */
  consent: z.literal(true),
  marketingConsent: z.boolean().default(false),
  locale: z.enum(['en-CA', 'fr-CA']),
  /**
   * Honeypot. A real browser leaves this empty; bots fill every field.
   * Kept out of the success/failure signal so a bot cannot detect the trap.
   */
  website: z.string().max(0).optional(),
});

export type ContactRequest = z.infer<typeof ContactRequestSchema>;

/**
 * Content that must never be accepted through a public form.
 *
 * FR-MKT-004 requires that owner notifications carry no sensitive test detail,
 * and the contact page tells visitors not to send credentials. Rejecting the
 * obvious cases keeps secrets out of the lead table entirely.
 */
const CREDENTIAL_PATTERNS: readonly RegExp[] = [
  /\bsk_(live|test)_[A-Za-z0-9]{8,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bpassword\s*[:=]\s*\S+/i,
  /\bapi[_-]?key\s*[:=]\s*\S+/i,
];

export function containsCredentialLikeContent(value: string): boolean {
  return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value));
}
