import type { Dimension } from '@/domain/scoring/dimensions';

/**
 * Finding severity, remediation workflow and critical-alert control.
 *
 * PRD refs: FR-FND-001..004, 10.8 (confidence).
 */

export const SEVERITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'observation',
] as const;

export type Severity = (typeof SEVERITIES)[number];

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

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

/**
 * Dimensions where a finding always requires explicit analyst confirmation
 * before it can be released (FR-EVAL-005: "all privacy/bias findings require
 * explicit analyst confirmation").
 */
const ALWAYS_CONFIRM_DIMENSIONS: readonly Dimension[] = ['safety_and_privacy'];

export interface FindingCandidate {
  severity: Severity;
  dimension: Dimension;
  confidence: Confidence;
  /** True when the evaluator cited an authoritative policy excerpt. */
  hasPolicySupport: boolean;
  /** True when deterministic checks and the evaluator disagreed. */
  evaluatorDisagreement: boolean;
  /** True when a human has already reviewed and approved this candidate. */
  humanConfirmed: boolean;
  /** True when a senior reviewer (not just any analyst) confirmed it. */
  seniorConfirmed: boolean;
  /** Flagged by the bias/fairness scenario category. */
  isFairnessFinding?: boolean;
}

export type ReviewRequirement = 'analyst_confirmation' | 'senior_confirmation';

/**
 * Which human review a candidate needs before it can appear in a report.
 *
 * PRD ref: FR-EVAL-005 and 10.8. There is no "no review needed" outcome:
 * FR-EVAL-001 makes analyst review step 5 of every evaluation, so the only
 * question this answers is whether a *senior* reviewer is additionally
 * required. Escalation to senior is deliberately conservative — the cost of an
 * unreviewed wrong Critical reaching a customer far exceeds an analyst minute.
 */
export function requiredReview(candidate: FindingCandidate): ReviewRequirement {
  if (candidate.severity === 'critical') return 'senior_confirmation';

  // 10.8: a low-confidence finding cannot carry the highest severities without
  // senior human confirmation.
  if (candidate.confidence === 'low' && candidate.severity === 'high') {
    return 'senior_confirmation';
  }

  // Privacy/safety and fairness findings carry disproportionate consequences
  // for the customer if published in error (FR-EVAL-005).
  if (
    candidate.isFairnessFinding === true ||
    ALWAYS_CONFIRM_DIMENSIONS.includes(candidate.dimension)
  ) {
    return candidate.severity === 'high'
      ? 'senior_confirmation'
      : 'analyst_confirmation';
  }

  return 'analyst_confirmation';
}

/**
 * Whether a candidate may be included in a released report.
 *
 * Nothing reaches a customer without at least analyst confirmation — the PRD
 * requires "Mandatory analyst review" as step 5 of the evaluation pipeline.
 */
export function canReleaseFinding(candidate: FindingCandidate): boolean {
  const requirement = requiredReview(candidate);
  if (requirement === 'senior_confirmation') return candidate.seniorConfirmed;
  return candidate.humanConfirmed || candidate.seniorConfirmed;
}

/**
 * A low-confidence candidate may not be *labelled* Critical without senior
 * confirmation (10.8). Returns the severity that may actually be published.
 */
export function publishableSeverity(candidate: FindingCandidate): Severity {
  if (
    candidate.severity === 'critical' &&
    candidate.confidence === 'low' &&
    !candidate.seniorConfirmed
  ) {
    return 'high';
  }
  return candidate.severity;
}

/** Remediation status transitions (FR-FND-004). */
const STATUS_TRANSITIONS: Record<FindingStatus, readonly FindingStatus[]> = {
  open: ['accepted', 'in_progress', 'risk_accepted', 'not_applicable'],
  accepted: ['in_progress', 'risk_accepted', 'not_applicable'],
  in_progress: ['ready_for_retest', 'risk_accepted', 'not_applicable'],
  ready_for_retest: [
    'resolved',
    'partially_resolved',
    'regressed',
    'in_progress',
  ],
  // A retest can reopen a resolved finding in a later cycle.
  resolved: ['regressed'],
  partially_resolved: ['in_progress', 'ready_for_retest', 'resolved', 'regressed'],
  risk_accepted: ['in_progress', 'open'],
  not_applicable: ['open'],
  regressed: ['in_progress', 'accepted', 'ready_for_retest'],
};

export type StatusChangeDenialCode =
  | 'INVALID_STATUS_TRANSITION'
  | 'REASON_REQUIRED'
  | 'RISK_ACCEPTANCE_REQUIRES_CLIENT_OWNER'
  | 'RISK_ACCEPTANCE_REQUIRES_REVIEW_DATE'
  | 'RETEST_RESULT_REQUIRES_INTERNAL_ROLE';

export interface StatusChangeRequest {
  from: FindingStatus;
  to: FindingStatus;
  /** Role of the actor making the change. */
  actorRole:
    | 'platform_owner'
    | 'analyst'
    | 'senior_analyst'
    | 'client_owner'
    | 'client_contributor';
  reason?: string;
  /** Required for risk acceptance (FR-FND-004). */
  reviewDate?: Date | null;
}

export type StatusChangeResult =
  | { allowed: true }
  | { allowed: false; code: StatusChangeDenialCode; message: string };

const INTERNAL_ROLES = ['platform_owner', 'analyst', 'senior_analyst'] as const;

/**
 * Statuses that assert a verified outcome. Only internal staff may set these —
 * a customer marking their own finding "resolved" would defeat the retest.
 */
const RETEST_OUTCOME_STATUSES: readonly FindingStatus[] = [
  'resolved',
  'partially_resolved',
  'regressed',
];

export function canChangeFindingStatus(
  request: StatusChangeRequest,
): StatusChangeResult {
  if (!STATUS_TRANSITIONS[request.from].includes(request.to)) {
    return {
      allowed: false,
      code: 'INVALID_STATUS_TRANSITION',
      message: `A finding cannot move from ${request.from} to ${request.to}.`,
    };
  }

  if (RETEST_OUTCOME_STATUSES.includes(request.to)) {
    const isInternal = (INTERNAL_ROLES as readonly string[]).includes(
      request.actorRole,
    );
    if (!isInternal) {
      return {
        allowed: false,
        code: 'RETEST_RESULT_REQUIRES_INTERNAL_ROLE',
        message:
          'A retest outcome is recorded by the analyst who verified it, not by the customer.',
      };
    }
  }

  if (request.to === 'risk_accepted') {
    // FR-FND-004: "Risk acceptance requires Client Owner identity, reason and
    // review date." It does not remove the historical finding.
    if (request.actorRole !== 'client_owner') {
      return {
        allowed: false,
        code: 'RISK_ACCEPTANCE_REQUIRES_CLIENT_OWNER',
        message:
          'Only the Client Owner can accept the risk of an open finding.',
      };
    }
    if (!request.reviewDate) {
      return {
        allowed: false,
        code: 'RISK_ACCEPTANCE_REQUIRES_REVIEW_DATE',
        message: 'Risk acceptance requires a review date.',
      };
    }
  }

  if (
    (request.to === 'risk_accepted' || request.to === 'not_applicable') &&
    (request.reason ?? '').trim() === ''
  ) {
    return {
      allowed: false,
      code: 'REASON_REQUIRED',
      message: `Moving a finding to ${request.to} requires a recorded reason.`,
    };
  }

  return { allowed: true };
}

/**
 * Critical alert control (FR-FND-003).
 *
 * A critical candidate must NOT trigger an automatic email containing detailed
 * sensitive evidence. The owner and assigned analyst receive a restricted
 * notice; the customer receives a sanitized notice only after human review.
 */
export interface CriticalAlertPlan {
  notifyInternal: boolean;
  /** Internal notice carries an identifier only, never evidence text. */
  internalPayloadIncludesEvidence: false;
  notifyCustomer: boolean;
  customerPayloadSanitized: true;
  requiresHumanApprovalBeforeCustomerNotice: boolean;
}

export function planCriticalAlert(
  candidate: FindingCandidate,
): CriticalAlertPlan {
  const isCritical = candidate.severity === 'critical';
  return {
    notifyInternal: isCritical,
    internalPayloadIncludesEvidence: false,
    // The customer is only notified after a human has reviewed the candidate.
    notifyCustomer: isCritical && candidate.seniorConfirmed,
    customerPayloadSanitized: true,
    requiresHumanApprovalBeforeCustomerNotice: isCritical,
  };
}

/** Severity ordering for report presentation, most severe first. */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITIES.indexOf(a) - SEVERITIES.indexOf(b);
}
