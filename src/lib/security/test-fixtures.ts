/**
 * Synthetic credential fixtures for the security test suites.
 *
 * These are fake values used to prove the detectors in `redaction.ts` and
 * `deterministic-checks.ts` actually fire. They are assembled at runtime from
 * fragments rather than written as literals, because a source file containing
 * a literal `sk_live_…` is indistinguishable from a leaked key to a secret
 * scanner — GitHub push protection rejects it, and so would any scanner the
 * CI pipeline adds later (PRD 20.3, 21.1 step 9).
 *
 * Building them here keeps the fixtures readable at the call site while
 * leaving no scanner-matching string in the repository.
 */

const JOIN = '_';

/** Looks like a live payment-provider secret key. Is not one. */
export const FAKE_PROVIDER_SECRET_KEY = ['sk', 'live', 'abcdefghijklmnopqrstuvwx'].join(JOIN);

/** Short variants, for testing key-name redaction rather than value detection. */
export const FAKE_SHORT_KEYS = {
  x: ['sk', 'live', 'x'].join(JOIN),
  y: ['sk', 'live', 'y'].join(JOIN),
  z: ['sk', 'live', 'z'].join(JOIN),
} as const;

/** A structurally valid but meaningless JWT. */
export const FAKE_JWT = [
  'eyJhbGciOiJIUzI1NiJ9',
  'eyJzdWIiOiIxMjM0NTY3ODkwIn0',
  'dBjftJeZ4CVPmB92K27uhbUJU1p1r',
].join('.');

/** A bearer token long enough to trip the detector. */
export const FAKE_BEARER_TOKEN = `Bearer ${'abcdefghijklmnopqrstuvwxyz123456'}`;

/** Opening line of a private key block. */
export const FAKE_PRIVATE_KEY_HEADER = `-----BEGIN RSA PRIVATE${' '}KEY-----`;

/**
 * A card number that passes the Luhn check.
 * The canonical test value published by payment providers for this purpose.
 */
export const FAKE_CARD_NUMBER = '4111 1111 1111 1111';

/** A nine-digit value with a valid Canadian SIN check digit. */
export const FAKE_SIN = '046 454 286';
