/**
 * Score dimensions and the default rubric weights (PRD 10.2, 10.3).
 */

export const SCORE_DIMENSIONS = [
  'factual_policy_accuracy',
  'resolution_effectiveness',
  'safety_privacy',
  'escalation_handoff',
  'context_memory',
  'empathy_tone',
  'language_cultural_fit',
] as const;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

/**
 * Default weights from PRD 10.2. They total 100.
 *
 * An analyst may run an approved industry template with different weights, but
 * PRD 10.2 requires the report to disclose them — see {@link RubricWeights}.
 */
export const DEFAULT_DIMENSION_WEIGHTS: Readonly<Record<ScoreDimension, number>> = Object.freeze({
  factual_policy_accuracy: 25,
  resolution_effectiveness: 20,
  safety_privacy: 15,
  escalation_handoff: 10,
  context_memory: 10,
  empathy_tone: 10,
  language_cultural_fit: 10,
});

export type RubricWeights = Readonly<Record<ScoreDimension, number>>;

/** Highest value on the PRD 10.3 dimension scale. Used as the score divisor. */
export const MAX_DIMENSION_SCORE = 5;

/**
 * A dimension result on one test case.
 *
 * `score: null` means "not applicable with documented reason" — PRD 10.3
 * requires N/A dimensions to be excluded from that case's denominator, and
 * requires the reason to be recorded.
 */
export interface DimensionResult {
  readonly dimension: ScoreDimension;
  /** Integer 0-5, or `null` for N/A. */
  readonly score: number | null;
  /** Required when `score` is `null`. */
  readonly notApplicableReason?: string;
}

export class ScoringError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ScoringError';
  }
}

/** Validates a dimension result against the PRD 10.3 scale. */
export function assertValidDimensionResult(result: DimensionResult): void {
  if (result.score === null) {
    if (!result.notApplicableReason || result.notApplicableReason.trim() === '') {
      throw new ScoringError(
        `Dimension "${result.dimension}" is marked not applicable without a documented reason.`,
        'NA_REASON_REQUIRED',
      );
    }
    return;
  }

  if (!Number.isInteger(result.score)) {
    throw new ScoringError(
      `Dimension "${result.dimension}" score must be an integer 0-${MAX_DIMENSION_SCORE}.`,
      'SCORE_NOT_INTEGER',
    );
  }

  if (result.score < 0 || result.score > MAX_DIMENSION_SCORE) {
    throw new ScoringError(
      `Dimension "${result.dimension}" score ${result.score} is outside 0-${MAX_DIMENSION_SCORE}.`,
      'SCORE_OUT_OF_RANGE',
    );
  }
}

/**
 * Validates a weight set.
 *
 * Weights need not total 100 — an approved industry template may use a
 * different total, and the case-score formula normalizes by the applicable
 * weight sum anyway. What is not allowed is a negative weight, or a set where
 * every weight is zero.
 */
export function assertValidWeights(weights: RubricWeights): void {
  let total = 0;

  for (const dimension of SCORE_DIMENSIONS) {
    const weight = weights[dimension];

    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      throw new ScoringError(
        `Weight for dimension "${dimension}" is missing or not a finite number.`,
        'WEIGHT_INVALID',
      );
    }

    if (weight < 0) {
      throw new ScoringError(`Weight for dimension "${dimension}" is negative.`, 'WEIGHT_NEGATIVE');
    }

    total += weight;
  }

  if (total <= 0) {
    throw new ScoringError('Rubric weights must total more than zero.', 'WEIGHT_TOTAL_ZERO');
  }
}

/**
 * True when the weight set differs from the PRD default, which means the
 * report must disclose the weighting (PRD 10.2).
 */
export function weightsAreNonDefault(weights: RubricWeights): boolean {
  return SCORE_DIMENSIONS.some(
    (dimension) => weights[dimension] !== DEFAULT_DIMENSION_WEIGHTS[dimension],
  );
}
