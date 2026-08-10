/**
 * Finding severity and remediation status (PRD FR-FND-002, FR-FND-004).
 */

export const FINDING_SEVERITIES = ['critical', 'high', 'medium', 'low', 'observation'] as const;

export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

/**
 * Ordering used for report ranking. Higher number = more severe.
 * An "observation" is explicitly not a defect (FR-FND-002).
 */
export const SEVERITY_RANK: Readonly<Record<FindingSeverity, number>> = Object.freeze({
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  observation: 1,
});

export function compareSeverityDescending(a: FindingSeverity, b: FindingSeverity): number {
  return SEVERITY_RANK[b] - SEVERITY_RANK[a];
}

export const FINDING_STATUSES = [
  'open',
  'accepted',
  'in_progress',
  'ready_for_retest',
  'resolved',
  'partially_resolved',
  'risk_accepted',
  'not_applicable',
  'regressed',
] as const;

export type FindingStatus = (typeof FINDING_STATUSES)[number];

/** Statuses that close a finding for reporting purposes. */
export const CLOSED_STATUSES: readonly FindingStatus[] = ['resolved', 'not_applicable'];

export type Confidence = 'low' | 'medium' | 'high';

/**
 * PRD 10.8: a low-confidence finding cannot be Critical without senior human
 * confirmation. Returns the reason it is blocked, or `null` when allowed.
 */
export function blockedCriticalReason(input: {
  readonly severity: FindingSeverity;
  readonly confidence: Confidence;
  readonly seniorConfirmedByUserId?: string | null;
}): string | null {
  if (input.severity !== 'critical') return null;
  if (input.confidence !== 'low') return null;

  if (!input.seniorConfirmedByUserId) {
    return 'A low-confidence finding cannot be recorded as Critical without senior human confirmation (PRD 10.8).';
  }

  return null;
}

/**
 * PRD FR-EVAL-005: results that must not pass on an AI proposal alone.
 *
 * Returns the list of reasons explicit analyst confirmation is required. An
 * empty list means the proposal may follow the normal review path.
 */
export function analystConfirmationReasons(input: {
  readonly confidence: Confidence;
  readonly severity: FindingSeverity;
  readonly hasPolicySupport: boolean;
  readonly evaluatorsDisagree: boolean;
  readonly category: string;
}): string[] {
  const reasons: string[] = [];

  if (input.confidence === 'low') {
    reasons.push('low_confidence');
  }

  if (!input.hasPolicySupport) {
    reasons.push('missing_policy_support');
  }

  if (input.evaluatorsDisagree) {
    reasons.push('evaluator_disagreement');
  }

  if (input.severity === 'critical') {
    reasons.push('critical_severity');
  }

  // FR-EVAL-005 singles out privacy and bias findings regardless of confidence.
  if (input.category === 'privacy_sensitive_information' || input.category === 'harmful_bias') {
    reasons.push('privacy_or_bias_finding');
  }

  return reasons;
}
