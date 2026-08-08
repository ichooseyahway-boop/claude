/**
 * Redaction and safe logging.
 *
 * PRD refs: 16.1 ("Structured redacted logs"), FR-ONB-005 ("Do not include
 * secrets in logs, analytics, reports or error messages"), 19.4 ("Never send
 * transcript text, prompt text, policy content, finding narrative,
 * credentials…"), 23.3.
 *
 * The rule this module enforces is allowlist, not blocklist: a log or analytics
 * payload may only contain fields that are known to be safe. Redacting a
 * blocklist of "bad" keys fails the first time someone adds `apiToken2`.
 */

export const REDACTED = '[redacted]';

/**
 * Keys whose values are never logged, in any casing or separator style.
 * Used as a second line of defence inside `redactObject`.
 */
const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
  /pass(word|phrase)?/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /credential/i,
  /cookie/i,
  /session/i,
  /signature/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /bearer/i,
  /card|cvv|cvc|pan\b/i,
  /sin\b|social[_-]?insurance/i,
  // Audit content, never logged.
  /transcript/i,
  /prompt/i,
  /response[_-]?text/i,
  /content/i,
  /narrative/i,
  /excerpt/i,
  /policy[_-]?text/i,
  /email/i,
  /phone/i,
];

/** Value patterns that indicate a secret regardless of the key name. */
const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  /\bsk_(live|test)_[A-Za-z0-9]{8,}/, // payment provider secret keys
  /\bwhsec_[A-Za-z0-9]{8,}/, // webhook signing secrets
  /\bBearer\s+[A-Za-z0-9._-]{16,}/i,
  /\beyJ[A-Za-z0-9._-]{20,}/, // JWT
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function containsSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/** Mask a secret for display after submission (FR-ONB-005). */
export function maskSecret(value: string, visibleSuffix = 4): string {
  if (value.length <= visibleSuffix) return REDACTED;
  return `${'•'.repeat(8)}${value.slice(-visibleSuffix)}`;
}

type Redactable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Redactable[]
  | { [key: string]: Redactable };

/**
 * Recursively redact sensitive keys and values.
 *
 * Depth and breadth are bounded so that a hostile or accidentally huge object
 * cannot turn logging into a denial-of-service vector.
 */
export function redactObject(
  input: Redactable,
  depth = 0,
  maxDepth = 6,
): Redactable {
  if (depth > maxDepth) return '[truncated]';

  if (typeof input === 'string') {
    return containsSensitiveValue(input) ? REDACTED : input;
  }
  if (
    input === null ||
    input === undefined ||
    typeof input === 'number' ||
    typeof input === 'boolean'
  ) {
    return input;
  }
  if (Array.isArray(input)) {
    return input
      .slice(0, 50)
      .map((item) => redactObject(item, depth + 1, maxDepth));
  }

  const output: Record<string, Redactable> = {};
  for (const [key, value] of Object.entries(input).slice(0, 100)) {
    output[key] = isSensitiveKey(key)
      ? REDACTED
      : redactObject(value, depth + 1, maxDepth);
  }
  return output;
}

/**
 * Fields permitted in a structured application log line.
 *
 * PRD 21.3: "Structured logs with actor and organization IDs, not content."
 */
export interface SafeLogFields {
  event: string;
  correlationId?: string;
  organizationId?: string;
  actorId?: string;
  actorRole?: string;
  projectId?: string;
  runId?: string;
  caseId?: string;
  findingId?: string;
  reportId?: string;
  /** Machine-readable error/result code, never a message with content. */
  code?: string;
  outcome?: 'success' | 'denied' | 'error';
  durationMs?: number;
  statusCode?: number;
  /** Coarse category only, e.g. "policy_pdf" — never a filename. */
  resourceType?: string;
}

const SAFE_LOG_KEYS: readonly (keyof SafeLogFields)[] = [
  'event',
  'correlationId',
  'organizationId',
  'actorId',
  'actorRole',
  'projectId',
  'runId',
  'caseId',
  'findingId',
  'reportId',
  'code',
  'outcome',
  'durationMs',
  'statusCode',
  'resourceType',
];

/**
 * Build a log payload containing ONLY allowlisted identifier fields.
 *
 * Anything not on the allowlist is dropped silently rather than redacted,
 * because a dropped field cannot leak and a "[redacted]" entry in every log
 * line trains people to ignore it.
 */
export function safeLogPayload(
  fields: SafeLogFields & Record<string, unknown>,
): Record<string, string | number> {
  const payload: Record<string, string | number> = {};
  for (const key of SAFE_LOG_KEYS) {
    const value = fields[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      // Identifiers are bounded; a long "id" is a smell worth truncating.
      payload[key] = containsSensitiveValue(value)
        ? REDACTED
        : value.slice(0, 200);
    } else if (typeof value === 'number') {
      payload[key] = value;
    }
  }
  return payload;
}

/**
 * Detect content that must never appear in a released report or an email
 * (FR-RPT-003 release scanner, FR-NOT-002).
 */
export interface LeakScanResult {
  clean: boolean;
  matches: string[];
}

export function scanForLeakedSecrets(text: string): LeakScanResult {
  const matches: string[] = [];
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    if (pattern.test(text)) {
      matches.push(pattern.source);
    }
  }
  return { clean: matches.length === 0, matches };
}
