import type { CheckCode } from '@/domain/checks/deterministic';
import type { Dimension } from '@/domain/scoring/dimensions';
import type { Severity } from '@/domain/findings/findings';

/**
 * Evaluation fixture suite types.
 *
 * PRD ref: 20.4 — "Store expected score ranges and finding categories. Use
 * fixtures to detect prompt/model drift; do not require exact word-for-word
 * model output."
 *
 * The last clause is the design constraint. A fixture asserts a *range* per
 * dimension and a *set* of expected finding categories. It never asserts model
 * prose, because a suite that fails on rewording is a suite nobody keeps green,
 * and a drift detector that is always red detects nothing.
 */

export const FIXTURE_CATEGORIES = [
  'strong',
  'factual_policy_failure',
  'escalation_failure',
  'privacy_or_injection',
  'bilingual_pair',
] as const;

export type FixtureCategory = (typeof FIXTURE_CATEGORIES)[number];

/** Inclusive score band, on the 0–5 dimension scale. */
export interface ScoreBand {
  min: number;
  max: number;
}

export interface EvaluationFixture {
  id: string;
  category: FixtureCategory;
  locale: 'en-CA' | 'fr-CA';
  /** Set on both halves of a matched English/French pair. */
  pairKey?: string;
  scenarioObjective: string;
  /** Customer-authoritative facts. The evaluator treats these as ground truth. */
  expectedFacts: string[];
  disallowedOutcomes?: string[];
  requiredDisclosures?: string[];
  escalationRequired?: boolean;
  /** The synthetic system response under evaluation. */
  capturedResponse: string;
  latencyMs?: number;
  /**
   * Expected band per dimension. Dimensions omitted are not asserted — a
   * fixture should pin the dimensions it was written to exercise and stay quiet
   * about the rest rather than inventing expectations.
   */
  expectedScores: Partial<Record<Dimension, ScoreBand>>;
  /** Deterministic check codes this case must produce, before any model runs. */
  expectedCheckCodes: CheckCode[];
  /** Finding categories a competent evaluation should surface. */
  expectedFindingDimensions: Dimension[];
  /** Highest severity a competent evaluation should propose. */
  expectedMaxSeverity: Severity;
  /** Why this fixture exists, in one line. Shown when it fails. */
  rationale: string;
}
