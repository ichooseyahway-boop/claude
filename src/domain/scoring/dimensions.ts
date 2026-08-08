/**
 * Score dimensions and the default rubric.
 *
 * PRD ref: section 10.2 (score dimensions and default weights).
 *
 * Weights live in a versioned rubric rather than in scoring code so that an
 * industry template can override them and the report can disclose which rubric
 * version produced a result (FR-EVAL-004).
 */

export const DIMENSIONS = [
  'factual_policy_accuracy',
  'resolution_effectiveness',
  'safety_and_privacy',
  'escalation_and_handoff',
  'context_and_memory',
  'empathy_and_tone',
  'language_and_cultural_fit',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export function isDimension(value: unknown): value is Dimension {
  return (
    typeof value === 'string' && (DIMENSIONS as readonly string[]).includes(value)
  );
}

/** Dimensions where an unresolved High finding triggers the D cap (10.6). */
export const HIGH_CAP_DIMENSIONS: readonly Dimension[] = [
  'factual_policy_accuracy',
  'safety_and_privacy',
  'escalation_and_handoff',
];

export interface Rubric {
  /** Stable identifier, e.g. "default". */
  id: string;
  /** Monotonic version string recorded on every scored case. */
  version: string;
  /** Weight per dimension. Must total 100 for the default rubric. */
  weights: Record<Dimension, number>;
  /**
   * True for the platform default rubric. A report using a non-default rubric
   * must disclose its weights (10.2).
   */
  isDefault: boolean;
}

export const DEFAULT_RUBRIC: Rubric = {
  id: 'default',
  version: '1.0.0',
  weights: {
    factual_policy_accuracy: 25,
    resolution_effectiveness: 20,
    safety_and_privacy: 15,
    escalation_and_handoff: 10,
    context_and_memory: 10,
    empathy_and_tone: 10,
    language_and_cultural_fit: 10,
  },
  isDefault: true,
};

export function totalWeight(rubric: Rubric): number {
  return DIMENSIONS.reduce((sum, d) => sum + rubric.weights[d], 0);
}

export class RubricError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RubricError';
  }
}

/**
 * Validate a rubric before it is used to score anything.
 *
 * A rubric whose weights do not total 100 would silently rescale every score,
 * so this throws rather than normalizing: a rubric is a reviewed artifact, and
 * an unreviewed one must not produce numbers that look plausible.
 */
export function assertValidRubric(rubric: Rubric): void {
  for (const dimension of DIMENSIONS) {
    const weight = rubric.weights[dimension];
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RubricError(
        `Rubric ${rubric.id}@${rubric.version}: weight for ${dimension} must be a non-negative number.`,
      );
    }
  }
  const total = totalWeight(rubric);
  if (Math.abs(total - 100) > 1e-9) {
    throw new RubricError(
      `Rubric ${rubric.id}@${rubric.version}: weights total ${total}, expected 100.`,
    );
  }
}
