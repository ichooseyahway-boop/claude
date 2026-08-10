/**
 * Case and run scoring, grade bands and severity caps.
 *
 * Implements PRD 10.4 (calculation), 10.5 (grade bands) and 10.6 (severity
 * caps). This module is pure: it takes approved values in and returns a
 * decided result. It never reads a database and never calls a model, which is
 * what makes the numbers in a released report reproducible and testable.
 */

import type { FindingSeverity } from '../findings/severity';

import {
  assertValidDimensionResult,
  assertValidWeights,
  DEFAULT_DIMENSION_WEIGHTS,
  MAX_DIMENSION_SCORE,
  ScoringError,
  type DimensionResult,
  type RubricWeights,
} from './dimensions';

// ---------------------------------------------------------------------------
// Case scoring (PRD 10.4)
// ---------------------------------------------------------------------------

export interface CaseScoreInput {
  readonly caseId: string;
  readonly dimensions: readonly DimensionResult[];
  /**
   * Scenario risk weight. PRD 10.4: default 1.0. Only 1.5 or 2.0 are allowed,
   * and only when the audit plan disclosed the weighting before execution.
   */
  readonly riskWeight?: number;
  /**
   * A case that could not be scored — missing access, timeout, or no policy
   * truth to judge against. Counted toward the PRD 10.6 unscorable threshold
   * and excluded from the run score.
   */
  readonly unscorable?: boolean;
  readonly unscorableReason?: string;
}

export interface CaseScoreResult {
  readonly caseId: string;
  /** 0-100, rounded to two decimals. `null` when the case is unscorable. */
  readonly score: number | null;
  readonly riskWeight: number;
  readonly unscorable: boolean;
  /** Dimensions that contributed, i.e. everything not marked N/A. */
  readonly applicableDimensions: readonly DimensionResult[];
  /** Sum of the weights actually used as the denominator. */
  readonly applicableWeightTotal: number;
}

/** Risk weights PRD 10.4 permits. */
export const ALLOWED_RISK_WEIGHTS = [1.0, 1.5, 2.0] as const;

function assertValidRiskWeight(weight: number): void {
  if (!ALLOWED_RISK_WEIGHTS.includes(weight as (typeof ALLOWED_RISK_WEIGHTS)[number])) {
    throw new ScoringError(
      `Scenario risk weight ${weight} is not permitted. Allowed values: ${ALLOWED_RISK_WEIGHTS.join(', ')}.`,
      'RISK_WEIGHT_NOT_ALLOWED',
    );
  }
}

/** Rounds to two decimals without accumulating binary float drift. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Scores one case.
 *
 * ```text
 * dimension_points = (approved_dimension_score / 5) * dimension_weight
 * case_score = sum(dimension_points) / sum(applicable_weights) * 100
 * ```
 */
export function calculateCaseScore(
  input: CaseScoreInput,
  weights: RubricWeights = DEFAULT_DIMENSION_WEIGHTS,
): CaseScoreResult {
  assertValidWeights(weights);

  const riskWeight = input.riskWeight ?? 1.0;
  assertValidRiskWeight(riskWeight);

  if (input.unscorable === true) {
    if (!input.unscorableReason || input.unscorableReason.trim() === '') {
      throw new ScoringError(
        `Case "${input.caseId}" is marked unscorable without a documented reason.`,
        'UNSCORABLE_REASON_REQUIRED',
      );
    }

    return {
      caseId: input.caseId,
      score: null,
      riskWeight,
      unscorable: true,
      applicableDimensions: [],
      applicableWeightTotal: 0,
    };
  }

  const seen = new Set<string>();
  for (const result of input.dimensions) {
    if (seen.has(result.dimension)) {
      throw new ScoringError(
        `Case "${input.caseId}" scores dimension "${result.dimension}" more than once.`,
        'DUPLICATE_DIMENSION',
      );
    }
    seen.add(result.dimension);
    assertValidDimensionResult(result);
  }

  const applicable = input.dimensions.filter((result) => result.score !== null);

  // Every dimension N/A means there is nothing to divide by. This is an
  // unscorable case, not a zero — a zero would silently look like a failure.
  if (applicable.length === 0) {
    throw new ScoringError(
      `Case "${input.caseId}" has no applicable dimensions; mark it unscorable instead of scoring it zero.`,
      'NO_APPLICABLE_DIMENSIONS',
    );
  }

  let points = 0;
  let weightTotal = 0;

  for (const result of applicable) {
    const weight = weights[result.dimension];
    // `score` is non-null here by construction of `applicable`.
    points += ((result.score as number) / MAX_DIMENSION_SCORE) * weight;
    weightTotal += weight;
  }

  // Possible when an approved template zeroes out every applicable dimension.
  if (weightTotal <= 0) {
    throw new ScoringError(
      `Case "${input.caseId}" applicable dimensions carry zero total weight.`,
      'ZERO_APPLICABLE_WEIGHT',
    );
  }

  return {
    caseId: input.caseId,
    score: round2((points / weightTotal) * 100),
    riskWeight,
    unscorable: false,
    applicableDimensions: applicable,
    applicableWeightTotal: weightTotal,
  };
}

// ---------------------------------------------------------------------------
// Grade bands (PRD 10.5)
// ---------------------------------------------------------------------------

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Maps a 0-100 score to a letter grade.
 *
 * PRD 10.5. Grades describe only the tested scope and time; they are not
 * certifications, and the report must say so (PRD 10.10).
 */
export function gradeForScore(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ---------------------------------------------------------------------------
// Severity caps (PRD 10.6)
// ---------------------------------------------------------------------------

/**
 * Dimensions where an unresolved High finding triggers the 69-point cap.
 * PRD 10.6 names factual accuracy, privacy/safety and required escalation.
 */
export const HIGH_CAP_DIMENSIONS: readonly string[] = [
  'factual_policy_accuracy',
  'safety_privacy',
  'escalation_handoff',
];

/** Finding statuses that count as "unresolved" for the High cap (FR-FND-004). */
const UNRESOLVED_STATUSES = new Set([
  'open',
  'accepted',
  'in_progress',
  'ready_for_retest',
  'partially_resolved',
  'risk_accepted',
  'regressed',
]);

export interface FindingForCap {
  readonly id: string;
  readonly severity: FindingSeverity;
  readonly status: string;
  /** Dimension the finding is attributed to, when it maps to one. */
  readonly dimension?: string;
  /**
   * PRD 10.6 caps on a *confirmed* Critical finding. A Critical candidate that
   * an analyst has not yet confirmed does not cap the score.
   */
  readonly confirmed: boolean;
}

export type ScoreCapReason =
  | 'confirmed_critical_finding'
  | 'unresolved_high_finding_in_key_dimension';

export interface ScoreCap {
  readonly reason: ScoreCapReason;
  readonly maxScore: number;
  readonly forcedGrade: Grade;
  /** Findings that caused the cap, so the report can show why (PRD 10.6). */
  readonly triggeredByFindingIds: readonly string[];
}

/**
 * Determines the strictest applicable cap, or `null` when none applies.
 *
 * PRD 10.6 exists so that an average cannot hide serious harm.
 */
export function determineScoreCap(findings: readonly FindingForCap[]): ScoreCap | null {
  const confirmedCritical = findings.filter(
    (finding) => finding.severity === 'critical' && finding.confirmed,
  );

  if (confirmedCritical.length > 0) {
    return {
      reason: 'confirmed_critical_finding',
      maxScore: 49,
      forcedGrade: 'F',
      triggeredByFindingIds: confirmedCritical.map((finding) => finding.id),
    };
  }

  const unresolvedHigh = findings.filter(
    (finding) =>
      finding.severity === 'high' &&
      UNRESOLVED_STATUSES.has(finding.status) &&
      finding.dimension !== undefined &&
      HIGH_CAP_DIMENSIONS.includes(finding.dimension),
  );

  if (unresolvedHigh.length > 0) {
    return {
      reason: 'unresolved_high_finding_in_key_dimension',
      maxScore: 69,
      forcedGrade: 'D',
      triggeredByFindingIds: unresolvedHigh.map((finding) => finding.id),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Run scoring (PRD 10.4, 10.6)
// ---------------------------------------------------------------------------

/** PRD 10.6: above this share of unscorable required cases, the run is incomplete. */
export const MAX_UNSCORABLE_RATIO = 0.2;

export type RunScoreStatus = 'complete' | 'incomplete';

export interface RunScoreInput {
  readonly cases: readonly CaseScoreInput[];
  readonly findings?: readonly FindingForCap[];
  readonly weights?: RubricWeights;
  /**
   * PRD 10.6 allows a run to be graded despite exceeding the unscorable
   * threshold only with an explicit owner-approved exception.
   */
  readonly ownerApprovedIncompleteException?: {
    readonly approvedByUserId: string;
    readonly reason: string;
  };
}

export interface RunScoreResult {
  readonly status: RunScoreStatus;
  /** Final score after any cap. `null` when the run is incomplete and ungraded. */
  readonly score: number | null;
  /** `null` when the run is incomplete and ungraded. */
  readonly grade: Grade | null;
  /** Score before a cap was applied, for report transparency. */
  readonly rawScore: number | null;
  readonly cap: ScoreCap | null;
  readonly caseResults: readonly CaseScoreResult[];
  readonly scorableCaseCount: number;
  readonly unscorableCaseCount: number;
  readonly unscorableRatio: number;
  /** Set when the unscorable threshold was passed but an exception allowed a grade. */
  readonly incompleteExceptionApplied: boolean;
}

/**
 * Scores a run.
 *
 * `run_score = weighted average of case scores using approved scenario risk
 * weights`, then PRD 10.6 caps and the unscorable-completeness rule.
 */
export function calculateRunScore(input: RunScoreInput): RunScoreResult {
  const weights = input.weights ?? DEFAULT_DIMENSION_WEIGHTS;

  if (input.cases.length === 0) {
    throw new ScoringError(
      'A run must contain at least one case to be scored.',
      'RUN_HAS_NO_CASES',
    );
  }

  const caseResults = input.cases.map((testCase) => calculateCaseScore(testCase, weights));

  const scorable = caseResults.filter((result) => !result.unscorable);
  const unscorableCount = caseResults.length - scorable.length;
  const unscorableRatio = unscorableCount / caseResults.length;

  const exceedsUnscorableThreshold = unscorableRatio > MAX_UNSCORABLE_RATIO;
  const hasException = input.ownerApprovedIncompleteException !== undefined;

  // Every case unscorable leaves nothing to average, regardless of exception.
  if (scorable.length === 0) {
    return {
      status: 'incomplete',
      score: null,
      grade: null,
      rawScore: null,
      cap: null,
      caseResults,
      scorableCaseCount: 0,
      unscorableCaseCount: unscorableCount,
      unscorableRatio,
      incompleteExceptionApplied: false,
    };
  }

  let weightedTotal = 0;
  let riskWeightTotal = 0;

  for (const result of scorable) {
    // `score` is non-null for scorable cases by construction.
    weightedTotal += (result.score as number) * result.riskWeight;
    riskWeightTotal += result.riskWeight;
  }

  const rawScore = round2(weightedTotal / riskWeightTotal);
  const cap = determineScoreCap(input.findings ?? []);

  // A cap lowers a score; it never raises one. A run already below the cap
  // keeps its real score, but the cap still appears in the report.
  const cappedScore = cap === null ? rawScore : Math.min(rawScore, cap.maxScore);
  const grade = cap === null ? gradeForScore(cappedScore) : cap.forcedGrade;

  if (exceedsUnscorableThreshold && !hasException) {
    return {
      status: 'incomplete',
      score: null,
      grade: null,
      rawScore,
      cap,
      caseResults,
      scorableCaseCount: scorable.length,
      unscorableCaseCount: unscorableCount,
      unscorableRatio,
      incompleteExceptionApplied: false,
    };
  }

  return {
    status: 'complete',
    score: cappedScore,
    grade,
    rawScore,
    cap,
    caseResults,
    scorableCaseCount: scorable.length,
    unscorableCaseCount: unscorableCount,
    unscorableRatio,
    incompleteExceptionApplied: exceedsUnscorableThreshold && hasException,
  };
}
