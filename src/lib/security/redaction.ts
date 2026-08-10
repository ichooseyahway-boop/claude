/**
 * Redaction and sensitive-pattern detection (PRD 16.1, 16.3, FR-ONB-005,
 * FR-RPT-003, 19.4, 21.3).
 *
 * Used in three places with three different intents:
 *
 * 1. Logging and analytics — strip anything sensitive before it leaves the
 *    process. Logs carry actor and organization IDs, never content.
 * 2. The report release scanner — refuse to release a report that still
 *    contains a credential or an unredacted restricted value.
 * 3. Test-data policy — FR-SCN-004 blocks real payment card and government
 *    identifier formats from entering a project without an approved exception.
 *
 * Detection here is pattern-based and therefore imperfect. It is a safety net
 * under human review (FR-RPT-003 also requires a reviewer), not a substitute
 * for it. A miss must never be the only thing standing between a credential
 * and a customer.
 */

export type SensitiveKind =
  | 'payment_card'
  | 'canadian_sin'
  | 'email'
  | 'phone'
  | 'api_key'
  | 'bearer_token'
  | 'private_key'
  | 'jwt'
  | 'password_assignment'
  | 'ipv4';

export interface SensitiveMatch {
  readonly kind: SensitiveKind;
  readonly start: number;
  readonly end: number;
  /** Never the raw value — a short, non-reversible descriptor. */
  readonly preview: string;
}

interface PatternDefinition {
  readonly kind: SensitiveKind;
  readonly pattern: RegExp;
  /** Extra validation beyond the shape, e.g. a checksum. */
  readonly validate?: (value: string) => boolean;
}

/**
 * Raw Luhn checksum over a digit string, with no length opinion.
 *
 * Kept separate from {@link passesLuhn} because a Canadian SIN is nine digits
 * and would fail a card-length check.
 */
function luhnChecksumValid(digits: string): boolean {
  if (digits.length === 0) return false;

  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const char = digits[index];
    if (char === undefined) return false;

    let digit = char.charCodeAt(0) - 48;
    if (digit < 0 || digit > 9) return false;

    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

/**
 * Luhn check constrained to payment-card lengths — keeps
 * "1234 5678 9012 3456" from being reported as a card.
 */
export function passesLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  return luhnChecksumValid(digits);
}

/**
 * Canadian SIN check digit (Luhn over 9 digits).
 * Applied so ordinary 9-digit order numbers do not trip the detector.
 */
export function isValidCanadianSin(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 9) return false;
  if (/^(\d)\1{8}$/.test(digits)) return false; // 000000000, 111111111, ...
  return luhnChecksumValid(digits);
}

const PATTERNS: readonly PatternDefinition[] = [
  {
    kind: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  {
    kind: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    kind: 'bearer_token',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi,
  },
  {
    // Provider-prefixed keys: sk_live_..., rk_test_..., ghp_..., xoxb-...
    kind: 'api_key',
    pattern: /\b(?:sk|pk|rk|whsec|ghp|gho|xoxb|xoxp)[_-][A-Za-z0-9_-]{16,}\b/g,
  },
  {
    kind: 'password_assignment',
    pattern: /\b(?:password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]\s*\S{6,}/gi,
  },
  {
    kind: 'payment_card',
    // Anchored so the final character is a digit. `(?:\d[ -]?){13,19}` would
    // also swallow the separator *after* the last digit, redacting the space
    // that follows the card number.
    pattern: /\b\d(?:[ -]?\d){12,18}\b/g,
    validate: passesLuhn,
  },
  {
    kind: 'canadian_sin',
    pattern: /\b\d{3}[ -]?\d{3}[ -]?\d{3}\b/g,
    validate: isValidCanadianSin,
  },
  {
    kind: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    kind: 'phone',
    pattern: /\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g,
  },
  {
    kind: 'ipv4',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  },
];

/**
 * Kinds that block a report release outright (FR-RPT-003: "no secrets or
 * unredacted restricted data detected").
 *
 * Emails and phone numbers are NOT in this list: a report legitimately names
 * an escalation contact, and blocking on those would make the gate so noisy
 * that a reviewer would learn to click past it.
 */
export const RELEASE_BLOCKING_KINDS: readonly SensitiveKind[] = [
  'payment_card',
  'canadian_sin',
  'api_key',
  'bearer_token',
  'private_key',
  'jwt',
  'password_assignment',
];

/** Finds sensitive values in free text. */
export function detectSensitive(text: string): SensitiveMatch[] {
  const matches: SensitiveMatch[] = [];

  for (const definition of PATTERNS) {
    // Fresh regex per call: a shared /g regex carries lastIndex between calls.
    const pattern = new RegExp(definition.pattern.source, definition.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];

      // Zero-length match would loop forever.
      if (value === '') {
        pattern.lastIndex += 1;
        continue;
      }

      if (definition.validate !== undefined && !definition.validate(value)) {
        continue;
      }

      matches.push({
        kind: definition.kind,
        start: match.index,
        end: match.index + value.length,
        preview: previewFor(definition.kind, value),
      });
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

/**
 * A short descriptor safe to put in a log line or a reviewer's screen.
 * Never reveals enough to reconstruct the value.
 */
function previewFor(kind: SensitiveKind, value: string): string {
  switch (kind) {
    case 'payment_card': {
      const digits = value.replace(/\D/g, '');
      return `card ending ${digits.slice(-4)}`;
    }
    case 'email': {
      const [, domain] = value.split('@');
      return `email at ${domain ?? 'unknown'}`;
    }
    default:
      return `${kind} (${value.length} chars)`;
  }
}

export interface RedactionResult {
  readonly text: string;
  readonly matches: readonly SensitiveMatch[];
  readonly redactedCount: number;
}

/**
 * Replaces every detected value with a typed placeholder.
 *
 * Overlapping matches are resolved by taking the earliest, longest match, so
 * a card number caught by both the card and phone patterns is redacted once.
 */
export function redact(text: string): RedactionResult {
  const matches = detectSensitive(text);

  if (matches.length === 0) {
    return { text, matches: [], redactedCount: 0 };
  }

  const chosen: SensitiveMatch[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) continue; // overlaps an already-chosen match
    chosen.push(match);
    cursor = match.end;
  }

  let output = '';
  let position = 0;

  for (const match of chosen) {
    output += text.slice(position, match.start);
    output += `[REDACTED:${match.kind.toUpperCase()}]`;
    position = match.end;
  }

  output += text.slice(position);

  return { text: output, matches: chosen, redactedCount: chosen.length };
}

/**
 * Release gate scan (FR-RPT-003).
 *
 * @returns the blocking matches. Empty means the content passed.
 */
export function scanForReleaseBlockers(text: string): SensitiveMatch[] {
  return detectSensitive(text).filter((match) => RELEASE_BLOCKING_KINDS.includes(match.kind));
}

// ---------------------------------------------------------------------------
// Structured redaction for logs (PRD 21.3)
// ---------------------------------------------------------------------------

/** Object keys whose values are dropped from logs regardless of content. */
const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'setcookie',
  'set_cookie',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'servicerolekey',
  'service_role_key',
  'clientsecret',
  'client_secret',
  'webhooksecret',
  'webhook_secret',
  'privatekey',
  'private_key',
  'creditcard',
  'credit_card',
  'cardnumber',
  'card_number',
  'cvv',
  'sin',
  // Content that PRD 19.4 forbids sending to logs or analytics.
  'transcript',
  'transcripts',
  'responsetext',
  'response_text',
  'prompttext',
  'prompt_text',
  'policycontent',
  'policy_content',
  'findingnarrative',
  'finding_narrative',
  'conversationturns',
  'conversation_turns',
]);

const REDACTED_PLACEHOLDER = '[REDACTED]';

/** Maximum depth before the redactor stops descending. */
const MAX_DEPTH = 8;

export type Loggable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Loggable[]
  | { [key: string]: Loggable };

/**
 * Recursively redacts a structure for logging.
 *
 * Drops values under sensitive keys entirely, and runs free-text redaction
 * over remaining strings so a transcript pasted into an unexpected field still
 * does not reach the log sink.
 */
export function redactForLog(value: unknown, depth = 0): Loggable {
  if (depth > MAX_DEPTH) return '[TRUNCATED:DEPTH]';

  if (value === null || value === undefined) return value ?? null;

  if (typeof value === 'string') {
    const result = redact(value);
    // Long free text is truncated as well: a log line is not a place for a
    // 40 KB response body, redacted or not.
    return result.text.length > 512 ? `${result.text.slice(0, 512)}…[TRUNCATED]` : result.text;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactForLog(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, Loggable> = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z_]/g, '');

      if (
        SENSITIVE_KEYS.has(normalizedKey) ||
        SENSITIVE_KEYS.has(normalizedKey.replace(/_/g, ''))
      ) {
        output[key] = REDACTED_PLACEHOLDER;
        continue;
      }

      output[key] = redactForLog(item, depth + 1);
    }

    return output;
  }

  return '[UNSERIALIZABLE]';
}
