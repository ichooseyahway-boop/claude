import {
  DIMENSIONS,
  DEFAULT_RUBRIC,
  HIGH_CAP_DIMENSIONS,
  assertValidRubric,
  type Dimension,
  type Rubric,
} from './dimensions';

/**
 * Case and run scoring, grade bands and severity caps.
 *
 * PRD refs: 10.3 (scale), 10.4 (calculation), 10.5 (grade bands),
 * 10.6 (severity caps).
 *
 * Every function here operates on APPROVED values only. AI-proposed scores are
 * never fed into these calculations (FR-EVAL-001: "AI-generated proposals are
 * never directly client-visible").
 */

/** 0–5 approved dimension score, or `null` for a documented N/A (10.3). */
export type DimensionScoreValue = 0 | 1 | 2 | 3 | 4 | 5 | null;

export const MAX_DIMENSION_SCORE = 5;

export interface DimensionScore {
  dimension: Dimension;
  /** `null` means Not Applicable and is excluded from the denominator. */
  score: DimensionScoreValue;
  /** Required whenever `score` is null (10.3: "with documented reason"). */
  notApplicableReason?: string;
}

export interface ScoredCase {
  caseId: string;
  locale: string;
  /** Scenario risk weight disclosed in the audit plan: 1.0, 1.5 or 2.0 (10.4). */
  riskWeight: number;
  scores: DimensionScore[];
  /**
   * True when the case could not be scored (missing access, timeout, missing
   * policy truth). Unscorable cases feed the 20% incompleteness rule (10.6).
   */
  unscorable?: boolean;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'observation';

export interface CapInput {
  severity: Severity;
  dimension: Dimension;
  /** Only confirmed (human-approved) findings can apply a cap (10.6, 10.8). */
  confirmed: boolean;
  /** Resolved findings from a prior cycle no longer cap the current run. */
  resolved: boolean;
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoringError';
  }
}

export const ALLOWED_RISK_WEIGHTS = [1.0, 1.5, 2.0] as const;

function assertValidDimensionScore(entry: DimensionScore): void {
  if (entry.score === null) {
    if (!entry.notApplicableReason || entry.notApplicableReason.trim() === '') {
      throw new ScoringError(
        `Dimension ${entry.dimension} marked N/A without a documented reason.`,
      );
    }
    return;
  }
  if (
    !Number.isInteger(entry.score) ||
    entry.score < 0 ||
    entry.score > MAX_DIMENSION_SCORE
  ) {
    throw new ScoringError(
      `Dimension ${entry.dimension} score ${entry.score} is outside the 0–5 scale.`,
    );
  }
}

/**
 * Case score, 0–100.
 *
 *   dimension_points = (approved_dimension_score / 5) * dimension_weight
 *   case_score = sum(dimension_points) / sum(applicable_weights) * 100
 *
 * Returns `null` when no dimension is applicable — a case with every dimension
 * N/A has no meaningful score and must not be silently recorded as 0.
 */
export function calculateCaseScore(
  scoredCase: ScoredCase,
  rubric: Rubric = DEFAULT_RUBRIC,
): number | null {
  assertValidRubric(rubric);

  const seen = new Set<Dimension>();
  let points = 0;
  let applicableWeight = 0;

  for (const entry of scoredCase.scores) {
    if (seen.has(entry.dimension)) {
      throw new ScoringError(
        `Case ${scoredCase.caseId} scores dimension ${entry.dimension} more than once.`,
      );
    }
    seen.add(entry.dimension);
    assertValidDimensionScore(entry);

    if (entry.score === null) continue;

    const weight = rubric.weights[entry.dimension];
    points += (entry.score / MAX_DIMENSION_SCORE) * weight;
    applicableWeight += weight;
  }

  if (applicableWeight === 0) return null;

  return (points / applicableWeight) * 100;
}

export interface RunScoreOptions {
  rubric?: Rubric;
  /** Confirmed findings for this run, used to apply severity caps. */
  findings?: CapInput[];
  /**
   * Fraction of required cases that may be unscorable before the run is marked
   * incomplete. Default 0.20 per 10.6.
   */
  maxUnscorableRatio?: number;
  /**
   * Set when the Platform Owner has approved an exception allowing a grade to
   * be issued despite exceeding the unscorable threshold (10.6).
   */
  ownerApprovedIncompleteException?: boolean;
}

export interface AppliedCap {
  reason:
    | 'confirmed_critical_finding'
    | 'unresolved_high_finding_in_capped_dimension';
  maxScore: number;
  maxGrade: Grade;
}

export interface RunScore {
  /** Weighted average before caps, or null when nothing was scorable. */
  rawScore: number | null;
  /** Score after caps are applied, or null when nothing was scorable. */
  score: number | null;
  grade: Grade | null;
  /** Every cap that matched, strongest first. All are shown in the report. */
  appliedCaps: AppliedCap[];
  scoredCaseCount: number;
  unscorableCaseCount: number;
  unscorableRatio: number;
  /** True when the run exceeds the unscorable threshold without an exception. */
  incomplete: boolean;
}

/**
 * Grade band for a 0–100 score (10.5).
 */
export function gradeForScore(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

const GRADE_ORDER: readonly Grade[] = ['A', 'B', 'C', 'D', 'F'];

/** Returns the worse (lower) of two grades. */
function worstGrade(a: Grade, b: Grade): Grade {
  return GRADE_ORDER.indexOf(a) >= GRADE_ORDER.indexOf(b) ? a : b;
}

/**
 * Determine which severity caps apply to a run (10.6).
 *
 * Only confirmed findings cap a score. A Critical candidate that has not been
 * human-adjudicated must not silently drag a customer's grade to F, and
 * FR-EVAL-005 requires that adjudication before release anyway.
 */
export function determineCaps(findings: readonly CapInput[]): AppliedCap[] {
  const caps: AppliedCap[] = [];

  const hasConfirmedCritical = findings.some(
    (f) => f.confirmed && f.severity === 'critical' && !f.resolved,
  );
  if (hasConfirmedCritical) {
    caps.push({
      reason: 'confirmed_critical_finding',
      maxScore: 49,
      maxGrade: 'F',
    });
  }

  const hasUnresolvedHighInCappedDimension = findings.some(
    (f) =>
      f.confirmed &&
      f.severity === 'high' &&
      !f.resolved &&
      HIGH_CAP_DIMENSIONS.includes(f.dimension),
  );
  if (hasUnresolvedHighInCappedDimension) {
    caps.push({
      reason: 'unresolved_high_finding_in_capped_dimension',
      maxScore: 69,
      maxGrade: 'D',
    });
  }

  return caps.sort((a, b) => a.maxScore - b.maxScore);
}

/**
 * Run score: risk-weighted average of case scores, then caps.
 *
 * Unscorable cases are excluded from the average rather than counted as zero —
 * a timeout is missing information, not evidence of a bad answer — but they are
 * counted toward the incompleteness threshold so the gap cannot be hidden.
 */
export function calculateRunScore(
  cases: readonly ScoredCase[],
  options: RunScoreOptions = {},
): RunScore {
  const rubric = options.rubric ?? DEFAULT_RUBRIC;
  const findings = options.findings ?? [];
  const maxUnscorableRatio = options.maxUnscorableRatio ?? 0.2;

  let weightedTotal = 0;
  let weightSum = 0;
  let scoredCaseCount = 0;
  let unscorableCaseCount = 0;

  for (const scoredCase of cases) {
    if (!ALLOWED_RISK_WEIGHTS.includes(scoredCase.riskWeight as 1 | 1.5 | 2)) {
      throw new ScoringError(
        `Case ${scoredCase.caseId} uses risk weight ${scoredCase.riskWeight}; only 1.0, 1.5 and 2.0 may be disclosed in an audit plan.`,
      );
    }

    if (scoredCase.unscorable) {
      unscorableCaseCount += 1;
      continue;
    }

    const caseScore = calculateCaseScore(scoredCase, rubric);
    if (caseScore === null) {
      unscorableCaseCount += 1;
      continue;
    }

    weightedTotal += caseScore * scoredCase.riskWeight;
    weightSum += scoredCase.riskWeight;
    scoredCaseCount += 1;
  }

  const totalCases = cases.length;
  const unscorableRatio =
    totalCases === 0 ? 0 : unscorableCaseCount / totalCases;
  const exceedsUnscorableThreshold = unscorableRatio > maxUnscorableRatio;
  const incomplete =
    exceedsUnscorableThreshold && !options.ownerApprovedIncompleteException;

  const rawScore = weightSum === 0 ? null : weightedTotal / weightSum;
  const appliedCaps = determineCaps(findings);

  if (rawScore === null) {
    return {
      rawScore: null,
      score: null,
      grade: null,
      appliedCaps,
      scoredCaseCount,
      unscorableCaseCount,
      unscorableRatio,
      incomplete: totalCases === 0 ? false : true,
    };
  }

  let score = rawScore;
  for (const cap of appliedCaps) {
    score = Math.min(score, cap.maxScore);
  }

  // No final grade is issued for an incomplete run without an owner-approved
  // exception (10.6).
  let grade: Grade | null = incomplete ? null : gradeForScore(score);
  if (grade !== null) {
    for (const cap of appliedCaps) {
      grade = worstGrade(grade, cap.maxGrade);
    }
  }

  return {
    rawScore,
    score,
    grade,
    appliedCaps,
    scoredCaseCount,
    unscorableCaseCount,
    unscorableRatio,
    incomplete,
  };
}

/** Round for display only. Stored values keep full precision. */
export function displayScore(score: number): number {
  return Math.round(score * 10) / 10;
}

export { DIMENSIONS, DEFAULT_RUBRIC };
export type { Dimension, Rubric };
