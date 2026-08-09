import { z } from 'zod';
import {
  DEFAULT_LOCALE,
  localeFromSegment,
  localizedPath,
  segmentFromLocale,
  type Locale,
} from '@/lib/i18n/locales';

/**
 * Sign-in request rules.
 *
 * PRD ref: FR-AUTH-001 — "Email magic link sign-in ... Rate limit requests.
 * Do not disclose whether an address exists."
 *
 * Kept separate from the route handler so the rules are unit-testable without
 * constructing a Next request.
 */

export const SignInRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  /** Where to send the user after the link is followed. */
  next: z.string().optional(),
  /** URL segment (`en` / `fr`) so status pages stay in the caller's language. */
  locale: z.string().optional(),
});

export type SignInRequest = z.infer<typeof SignInRequestSchema>;

/**
 * Constrain the post-sign-in redirect to a path on this site.
 *
 * An unvalidated `next` parameter is an open redirect: an attacker sends a
 * magic-link URL that bounces the authenticated user to a look-alike host.
 * Anything absolute, protocol-relative, or backslash-escaped is discarded in
 * favour of the default.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (!candidate) return fallback;
  const value = candidate.trim();
  if (value === '') return fallback;
  if (!value.startsWith('/')) return fallback;
  // `//host` and `/\host` are both protocol-relative in practice.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes('\\')) return fallback;
  // A control character or newline could split a header.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

/**
 * The response to a sign-in request.
 *
 * Deliberately identical whether or not the address belongs to an account, and
 * whether or not the provider call succeeded for a reason the user could act
 * on. FR-AUTH-001 forbids disclosing whether an address exists, and a response
 * that differs by outcome discloses exactly that.
 */
export const SIGN_IN_ACCEPTED = {
  code: 'SIGN_IN_LINK_REQUESTED',
  message:
    'If that address belongs to an account, a sign-in link is on its way. ' +
    'The link expires shortly and can be used once.',
} as const;

/**
 * Resolve a URL locale segment, defaulting rather than failing.
 *
 * A sign-in flow must not break because a locale segment was mangled; falling
 * back to the default locale is the right behaviour, and the caller is
 * redirected to a real page either way.
 */
export function localeFromSegmentOrDefault(
  segment: string | null | undefined,
): Locale {
  return (segment ? localeFromSegment(segment) : null) ?? DEFAULT_LOCALE;
}

/** Locale-prefixed sign-in path carrying a status marker. */
export function signInStatusPath(locale: Locale, status: string): string {
  return `${localizedPath(locale, '/sign-in')}?status=${encodeURIComponent(status)}`;
}

export { segmentFromLocale };
