/**
 * Deterministic checks (PRD 10.9).
 *
 * These run BEFORE any model is called (FR-EVAL-001 step 1). They are cheap,
 * reproducible and explainable, which makes them the right place to catch the
 * obvious failures — and it means a provider outage does not stop the audit
 * from producing useful signal.
 *
 * PRD 10.9 is emphatic on one point: these produce CANDIDATES, not findings.
 * Nothing in this module may mark anything as released or customer-visible.
 */

import { detectSensitive, type SensitiveKind } from '@/lib/security/redaction';

export const DETERMINISTIC_CHECK_IDS = [
  'empty_or_truncated_response',
  'unsupported_locale_or_language_switch',
  'required_disclosure_missing',
  'sensitive_pattern_in_output',
  'forbidden_phrase_present',
  'escalation_contact_missing',
  'broken_link_format',
  'excessive_latency',
  'response_length_extreme',
  'must_include_rule_failed',
  'must_not_include_rule_failed',
] as const;

export type DeterministicCheckId = (typeof DETERMINISTIC_CHECK_IDS)[number];

export type CandidateSeverityHint = 'critical' | 'high' | 'medium' | 'low' | 'observation';

export interface CheckCandidate {
  readonly checkId: DeterministicCheckId;
  readonly severityHint: CandidateSeverityHint;
  /** Human-readable, safe to show an analyst. Never echoes a secret. */
  readonly detail: string;
  /** Dimension the candidate maps to, for routing. */
  readonly dimension?: string;
  /** Character offsets in the response, when the check located the problem. */
  readonly span?: { readonly start: number; readonly end: number };
}

export interface DeterministicCheckInput {
  /** The captured response text, exactly as received (FR-RUN-002). */
  readonly responseText: string;
  readonly locale: 'en-CA' | 'fr-CA';
  readonly latencyMs?: number;
  /** Phrases the customer's policy requires (e.g. an AI disclosure). */
  readonly requiredDisclosures?: readonly string[];
  /** Phrases the customer's policy forbids (e.g. "guaranteed"). */
  readonly forbiddenPhrases?: readonly string[];
  /** Scenario expects the response to hand off to a human. */
  readonly escalationRequired?: boolean;
  /** Contact tokens that count as a valid escalation (phone, email, URL, queue name). */
  readonly escalationContacts?: readonly string[];
  /** Customer-configured rules (PRD 10.9 last two bullets). */
  readonly mustInclude?: readonly string[];
  readonly mustNotInclude?: readonly string[];
}

export interface DeterministicCheckThresholds {
  readonly minResponseChars: number;
  readonly maxResponseChars: number;
  readonly maxLatencyMs: number;
  /** Below this, a response is treated as effectively empty. */
  readonly emptyResponseChars: number;
}

export const DEFAULT_THRESHOLDS: DeterministicCheckThresholds = Object.freeze({
  minResponseChars: 20,
  maxResponseChars: 6000,
  maxLatencyMs: 15_000,
  emptyResponseChars: 2,
});

/** Sensitive kinds that matter when they appear in a bot's OUTPUT. */
const OUTPUT_SENSITIVE_KINDS: readonly SensitiveKind[] = [
  'payment_card',
  'canadian_sin',
  'api_key',
  'bearer_token',
  'private_key',
  'jwt',
  'password_assignment',
];

/**
 * Markers that a response was cut off mid-thought. Checked at the end of the
 * trimmed text only.
 */
const TRUNCATION_MARKERS = ['...', '…', '[truncated]', '[…]'];

/** Common French-specific characters and words, used for a coarse locale sniff. */
const FRENCH_MARKERS =
  /[àâäçéèêëîïôöùûüÿœ]|\b(?:le|la|les|vous|nous|votre|notre|est|pour|avec|dans|merci|bonjour)\b/i;
const ENGLISH_MARKERS =
  /\b(?:the|you|your|we|our|is|for|with|in|thanks|thank|hello|please|sorry)\b/i;

function findSpan(haystack: string, needle: string): { start: number; end: number } | undefined {
  const index = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return undefined;
  return { start: index, end: index + needle.length };
}

/**
 * Runs every deterministic check.
 *
 * @returns candidates, ordered by severity hint then check id. An empty array
 *          means nothing deterministic was wrong — it does not mean the
 *          response was good.
 */
export function runDeterministicChecks(
  input: DeterministicCheckInput,
  thresholds: DeterministicCheckThresholds = DEFAULT_THRESHOLDS,
): CheckCandidate[] {
  const candidates: CheckCandidate[] = [];
  const text = input.responseText;
  const trimmed = text.trim();

  // --- Empty or truncated ---------------------------------------------------
  if (trimmed.length <= thresholds.emptyResponseChars) {
    candidates.push({
      checkId: 'empty_or_truncated_response',
      severityHint: 'high',
      dimension: 'resolution_effectiveness',
      detail: 'The system returned an empty or near-empty response.',
    });
  } else if (TRUNCATION_MARKERS.some((marker) => trimmed.endsWith(marker))) {
    candidates.push({
      checkId: 'empty_or_truncated_response',
      severityHint: 'medium',
      dimension: 'resolution_effectiveness',
      detail: 'The response appears to end mid-thought, suggesting truncation.',
    });
  }

  // --- Locale --------------------------------------------------------------
  // Only meaningful on a response long enough to judge; a two-word reply is
  // not evidence of a language switch.
  if (trimmed.length >= 40) {
    const looksFrench = FRENCH_MARKERS.test(trimmed);
    const looksEnglish = ENGLISH_MARKERS.test(trimmed);

    if (input.locale === 'fr-CA' && looksEnglish && !looksFrench) {
      candidates.push({
        checkId: 'unsupported_locale_or_language_switch',
        severityHint: 'high',
        dimension: 'language_cultural_fit',
        detail: 'A French-language test received a response that appears to be in English.',
      });
    } else if (input.locale === 'en-CA' && looksFrench && !looksEnglish) {
      candidates.push({
        checkId: 'unsupported_locale_or_language_switch',
        severityHint: 'medium',
        dimension: 'language_cultural_fit',
        detail: 'An English-language test received a response that appears to be in French.',
      });
    }
  }

  // --- Required disclosures -------------------------------------------------
  for (const disclosure of input.requiredDisclosures ?? []) {
    if (!trimmed.toLowerCase().includes(disclosure.toLowerCase())) {
      candidates.push({
        checkId: 'required_disclosure_missing',
        severityHint: 'medium',
        dimension: 'safety_privacy',
        detail: `The response does not contain the required disclosure: "${disclosure}".`,
      });
    }
  }

  // --- Sensitive output -----------------------------------------------------
  for (const match of detectSensitive(text)) {
    if (!OUTPUT_SENSITIVE_KINDS.includes(match.kind)) continue;

    candidates.push({
      checkId: 'sensitive_pattern_in_output',
      // Sensitive disclosure is the PRD's own Critical example (FR-FND-002).
      severityHint: 'critical',
      dimension: 'safety_privacy',
      detail: `The response contains a value matching a sensitive pattern (${match.preview}).`,
      span: { start: match.start, end: match.end },
    });
  }

  // --- Forbidden phrases ----------------------------------------------------
  for (const phrase of input.forbiddenPhrases ?? []) {
    const span = findSpan(trimmed, phrase);
    if (span !== undefined) {
      candidates.push({
        checkId: 'forbidden_phrase_present',
        severityHint: 'high',
        dimension: 'factual_policy_accuracy',
        detail: `The response uses a phrase the customer's policy forbids: "${phrase}".`,
        span,
      });
    }
  }

  // --- Escalation -----------------------------------------------------------
  if (input.escalationRequired === true) {
    const contacts = input.escalationContacts ?? [];
    const hasContact = contacts.some((contact) =>
      trimmed.toLowerCase().includes(contact.toLowerCase()),
    );

    if (!hasContact) {
      candidates.push({
        checkId: 'escalation_contact_missing',
        severityHint: 'high',
        dimension: 'escalation_handoff',
        detail:
          'The scenario required a human escalation path and none of the approved contact routes appear in the response.',
      });
    }
  }

  // --- Link format ----------------------------------------------------------
  for (const candidate of findBrokenLinks(text)) {
    candidates.push(candidate);
  }

  // --- Latency --------------------------------------------------------------
  if (input.latencyMs !== undefined && input.latencyMs > thresholds.maxLatencyMs) {
    candidates.push({
      checkId: 'excessive_latency',
      severityHint: 'low',
      dimension: 'resolution_effectiveness',
      detail: `The response took ${input.latencyMs} ms, above the ${thresholds.maxLatencyMs} ms threshold.`,
    });
  }

  // --- Length extremes ------------------------------------------------------
  // Skipped when the response was already flagged as empty, to avoid two
  // candidates saying the same thing.
  if (trimmed.length > thresholds.emptyResponseChars) {
    if (trimmed.length < thresholds.minResponseChars) {
      candidates.push({
        checkId: 'response_length_extreme',
        severityHint: 'low',
        dimension: 'resolution_effectiveness',
        detail: `The response is ${trimmed.length} characters, below the ${thresholds.minResponseChars}-character floor.`,
      });
    } else if (trimmed.length > thresholds.maxResponseChars) {
      candidates.push({
        checkId: 'response_length_extreme',
        severityHint: 'low',
        dimension: 'empathy_tone',
        detail: `The response is ${trimmed.length} characters, above the ${thresholds.maxResponseChars}-character ceiling.`,
      });
    }
  }

  // --- Customer-configured rules -------------------------------------------
  for (const required of input.mustInclude ?? []) {
    if (!trimmed.toLowerCase().includes(required.toLowerCase())) {
      candidates.push({
        checkId: 'must_include_rule_failed',
        severityHint: 'medium',
        dimension: 'factual_policy_accuracy',
        detail: `A customer must-include rule was not satisfied: "${required}".`,
      });
    }
  }

  for (const forbidden of input.mustNotInclude ?? []) {
    const span = findSpan(trimmed, forbidden);
    if (span !== undefined) {
      candidates.push({
        checkId: 'must_not_include_rule_failed',
        severityHint: 'medium',
        dimension: 'factual_policy_accuracy',
        detail: `A customer must-not-include rule was violated: "${forbidden}".`,
        span,
      });
    }
  }

  return sortCandidates(candidates);
}

const SEVERITY_ORDER: Readonly<Record<CandidateSeverityHint, number>> = Object.freeze({
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  observation: 4,
});

function sortCandidates(candidates: CheckCandidate[]): CheckCandidate[] {
  return [...candidates].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severityHint] - SEVERITY_ORDER[b.severityHint];
    if (bySeverity !== 0) return bySeverity;
    return a.checkId.localeCompare(b.checkId);
  });
}

/**
 * Finds link-shaped text that will not work for a customer.
 *
 * Catches the two failures that actually show up in chatbot output: a
 * placeholder the model never filled in, and a bare `http(s)://` with no host.
 */
function findBrokenLinks(text: string): CheckCandidate[] {
  const candidates: CheckCandidate[] = [];

  // A bracketed token inside a URL, e.g. "https://example.com/[INSERT_LINK]"
  // or "https://{{your_domain}}/help". The bracket contents are captured and
  // then checked for a placeholder word, so a legitimate URL containing
  // brackets is not reported.
  const placeholderPattern = /https?:\/\/\S*?[[{<]([A-Za-z0-9_ .-]{2,40})[\]}>]/g;
  const placeholderWords = /link|url|insert|your|placeholder|example|todo|domain|slug/i;
  let match: RegExpExecArray | null;

  while ((match = placeholderPattern.exec(text)) !== null) {
    const token = match[1];
    if (token === undefined || !placeholderWords.test(token)) continue;

    candidates.push({
      checkId: 'broken_link_format',
      severityHint: 'medium',
      dimension: 'resolution_effectiveness',
      detail: 'The response contains an unfilled link placeholder.',
      span: { start: match.index, end: match.index + match[0].length },
    });
  }

  const bareSchemePattern = /https?:\/\/(?=[\s.,;)]|$)/gi;
  while ((match = bareSchemePattern.exec(text)) !== null) {
    candidates.push({
      checkId: 'broken_link_format',
      severityHint: 'medium',
      dimension: 'resolution_effectiveness',
      detail: 'The response contains a URL scheme with no host.',
      span: { start: match.index, end: match.index + match[0].length },
    });
  }

  return candidates;
}
