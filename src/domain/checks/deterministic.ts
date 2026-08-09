/**
 * Deterministic checks.
 *
 * PRD ref: 10.9, FR-EVAL-001 step 1.
 *
 * These run BEFORE any model evaluation and are cheap, explainable and stable.
 * They produce CANDIDATES only — "Deterministic checks create candidates, not
 * automatically released findings." Nothing here decides a score.
 */

export const CHECK_CODES = [
  'empty_or_truncated_response',
  'unexpected_language',
  'required_disclosure_missing',
  'sensitive_pattern_in_output',
  'forbidden_phrase',
  'missing_escalation_contact',
  'malformed_link',
  'excessive_latency',
  'response_length_extreme',
  'must_include_rule_failed',
  'must_not_include_rule_failed',
] as const;

export type CheckCode = (typeof CHECK_CODES)[number];

export interface CheckCandidate {
  code: CheckCode;
  /** Suggested severity for analyst triage. Never published as-is. */
  suggestedSeverity: 'critical' | 'high' | 'medium' | 'low' | 'observation';
  /** Explanation shown to the analyst, never to the customer directly. */
  detail: string;
  /** Character offsets in the response, for evidence linking. */
  span?: { start: number; end: number };
}

export interface CheckContext {
  responseText: string;
  /** Locale the response was expected to be in. */
  expectedLocale: 'en-CA' | 'fr-CA';
  latencyMs: number;
  /** Latency above which the scenario considers the response too slow. */
  latencyThresholdMs?: number;
  /** Phrases the customer's policy requires (e.g. a legal disclosure). */
  requiredDisclosures?: readonly string[];
  /** Phrases the customer's policy forbids. */
  forbiddenPhrases?: readonly string[];
  /** Scenario requires an escalation contact in the response. */
  escalationRequired?: boolean;
  /** Known escalation markers, e.g. a support phone or "speak to an agent". */
  escalationMarkers?: readonly string[];
  /** Customer-configured must-include rules (10.9). */
  mustInclude?: readonly string[];
  mustNotInclude?: readonly string[];
  minLength?: number;
  maxLength?: number;
  /** True when the capture recorded a timeout or transport error. */
  captureError?: boolean;
}

const DEFAULT_LATENCY_THRESHOLD_MS = 15_000;
const DEFAULT_MIN_LENGTH = 10;
const DEFAULT_MAX_LENGTH = 8_000;

/**
 * Patterns that suggest sensitive data appeared in the tested system's output.
 *
 * These are deliberately narrow. A false positive costs an analyst a glance; a
 * pattern loose enough to match ordinary prose would train reviewers to dismiss
 * the check entirely.
 */
const SENSITIVE_OUTPUT_PATTERNS: ReadonlyArray<{
  code: string;
  pattern: RegExp;
}> = [
  // Card-like 13–19 digit sequences that pass a basic grouping shape.
  { code: 'card_number', pattern: /\b(?:\d[ -]?){13,19}\b/ },
  // Canadian SIN shape.
  { code: 'sin', pattern: /\b\d{3}[ -]\d{3}[ -]\d{3}\b/ },
  { code: 'email', pattern: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/ },
  { code: 'api_key', pattern: /\b(sk|pk)_(live|test)_[A-Za-z0-9]{8,}/ },
  { code: 'private_key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

/** Very small heuristic: does the text look like the expected language? */
const FRENCH_MARKERS =
  /\b(vous|votre|nous|est|des|une|pour|avec|merci|bonjour|remboursement|commande)\b/i;
const ENGLISH_MARKERS =
  /\b(you|your|we|the|and|for|with|thanks|hello|refund|order)\b/i;

function luhnValid(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = clean.length - 1; i >= 0; i -= 1) {
    let digit = Number(clean[i]);
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
 * Run every deterministic check against a captured response.
 *
 * Returns candidates ordered by suggested severity so the analyst queue shows
 * the most consequential first.
 */
export function runDeterministicChecks(
  context: CheckContext,
): CheckCandidate[] {
  const candidates: CheckCandidate[] = [];
  const text = context.responseText ?? '';
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (context.captureError || trimmed.length === 0) {
    candidates.push({
      code: 'empty_or_truncated_response',
      suggestedSeverity: 'high',
      detail: context.captureError
        ? 'The capture recorded a transport error or timeout; no response text is available.'
        : 'The system returned an empty response.',
    });
    // Every remaining check needs response text, so stop here.
    return candidates;
  }

  const minLength = context.minLength ?? DEFAULT_MIN_LENGTH;
  const maxLength = context.maxLength ?? DEFAULT_MAX_LENGTH;
  if (trimmed.length < minLength) {
    candidates.push({
      code: 'response_length_extreme',
      suggestedSeverity: 'medium',
      detail: `Response is ${trimmed.length} characters, below the ${minLength}-character minimum for this scenario.`,
    });
  } else if (trimmed.length > maxLength) {
    candidates.push({
      code: 'response_length_extreme',
      suggestedSeverity: 'low',
      detail: `Response is ${trimmed.length} characters, above the ${maxLength}-character maximum for this scenario.`,
    });
  }

  // Language check (10.9: "Unsupported locale or unexpected language switching")
  const looksFrench = FRENCH_MARKERS.test(trimmed);
  const looksEnglish = ENGLISH_MARKERS.test(trimmed);
  if (context.expectedLocale === 'fr-CA' && looksEnglish && !looksFrench) {
    candidates.push({
      code: 'unexpected_language',
      suggestedSeverity: 'high',
      detail:
        'A French scenario received a response that appears to be in English.',
    });
  } else if (
    context.expectedLocale === 'en-CA' &&
    looksFrench &&
    !looksEnglish
  ) {
    candidates.push({
      code: 'unexpected_language',
      suggestedSeverity: 'high',
      detail:
        'An English scenario received a response that appears to be in French.',
    });
  }

  for (const disclosure of context.requiredDisclosures ?? []) {
    if (!lower.includes(disclosure.toLowerCase())) {
      candidates.push({
        code: 'required_disclosure_missing',
        suggestedSeverity: 'high',
        detail: `The response does not contain the required disclosure: "${disclosure}".`,
      });
    }
  }

  for (const phrase of context.forbiddenPhrases ?? []) {
    const index = lower.indexOf(phrase.toLowerCase());
    if (index >= 0) {
      candidates.push({
        code: 'forbidden_phrase',
        suggestedSeverity: 'high',
        detail: `The response contains a phrase the customer's policy forbids: "${phrase}".`,
        span: { start: index, end: index + phrase.length },
      });
    }
  }

  for (const rule of context.mustInclude ?? []) {
    if (!lower.includes(rule.toLowerCase())) {
      candidates.push({
        code: 'must_include_rule_failed',
        suggestedSeverity: 'medium',
        detail: `Customer must-include rule not satisfied: "${rule}".`,
      });
    }
  }

  for (const rule of context.mustNotInclude ?? []) {
    const index = lower.indexOf(rule.toLowerCase());
    if (index >= 0) {
      candidates.push({
        code: 'must_not_include_rule_failed',
        suggestedSeverity: 'medium',
        detail: `Customer must-not-include rule violated: "${rule}".`,
        span: { start: index, end: index + rule.length },
      });
    }
  }

  if (context.escalationRequired) {
    const markers = context.escalationMarkers ?? [
      'agent',
      'representative',
      'human',
      'support team',
      'contact us',
      'conseiller',
      'agent humain',
      'service à la clientèle',
      'nous joindre',
    ];
    const hasEscalation = markers.some((marker) =>
      lower.includes(marker.toLowerCase()),
    );
    if (!hasEscalation) {
      candidates.push({
        code: 'missing_escalation_contact',
        suggestedSeverity: 'high',
        detail:
          'The scenario requires an escalation path, and no human contact route appears in the response.',
      });
    }
  }

  for (const { code, pattern } of SENSITIVE_OUTPUT_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (!match) continue;
    // Reduce card false positives (order numbers, phone strings) using Luhn.
    if (code === 'card_number' && !luhnValid(match[0])) continue;
    candidates.push({
      code: 'sensitive_pattern_in_output',
      suggestedSeverity: 'critical',
      detail: `A ${code.replace(/_/g, ' ')} pattern appeared in the system's output and requires human review before any notification.`,
      span: { start: match.index, end: match.index + match[0].length },
    });
  }

  // Malformed links: an anchor-looking token that is not a resolvable URL.
  const linkCandidates = trimmed.match(/https?:\/\/\S+/g) ?? [];
  for (const link of linkCandidates) {
    const cleaned = link.replace(/[.,;:)\]]+$/, '');
    try {
      const url = new URL(cleaned);
      if (url.hostname === '' || !url.hostname.includes('.')) {
        throw new Error('no host');
      }
    } catch {
      candidates.push({
        code: 'malformed_link',
        suggestedSeverity: 'low',
        detail: `The response contains a malformed link: "${cleaned}".`,
      });
    }
  }

  const latencyThreshold =
    context.latencyThresholdMs ?? DEFAULT_LATENCY_THRESHOLD_MS;
  if (context.latencyMs > latencyThreshold) {
    candidates.push({
      code: 'excessive_latency',
      suggestedSeverity: 'medium',
      detail: `Response took ${context.latencyMs}ms, above the ${latencyThreshold}ms threshold for this scenario.`,
    });
  }

  const severityOrder = ['critical', 'high', 'medium', 'low', 'observation'];
  return candidates.sort(
    (a, b) =>
      severityOrder.indexOf(a.suggestedSeverity) -
      severityOrder.indexOf(b.suggestedSeverity),
  );
}
