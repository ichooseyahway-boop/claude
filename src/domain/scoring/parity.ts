/**
 * Bilingual parity index.
 *
 * PRD ref: section 10.7.
 *
 *   pair_gap = |english_case_score - french_case_score|
 *   parity_index = 100 - weighted_average(pair_gap)
 *
 * A pair only counts when BOTH sides were scorable. A French case that timed
 * out is missing information, not evidence of a language gap, so counting it as
 * a 100-point gap would manufacture a finding that the evidence cannot support.
 */

export const MINIMUM_MATCHED_PAIRS = 10;

export type ParityBand =
  'equivalent' | 'minor_inconsistency' | 'material_gap' | 'severe_inequity';

export interface MatchedPair {
  pairId: string;
  /** Case score 0–100, or null when that side was unscorable. */
  englishScore: number | null;
  frenchScore: number | null;
  /** Scenario risk weight, mirroring the run score weighting. */
  riskWeight?: number;
}

export interface PairGap {
  pairId: string;
  gap: number;
  riskWeight: number;
  /** Which locale scored lower — the direction a customer would experience. */
  weakerLocale: 'en-CA' | 'fr-CA' | null;
}

export interface ParityResult {
  /** Null when there are too few valid pairs to publish a number (10.7). */
  parityIndex: number | null;
  band: ParityBand | null;
  /**
   * True when a qualitative assessment must be shown instead of a number.
   * The report template keys off this rather than off `parityIndex === null`.
   */
  qualitativeOnly: boolean;
  validPairCount: number;
  excludedPairCount: number;
  /** Largest gaps first, for the report's parity section. */
  gaps: PairGap[];
  largestGap: PairGap | null;
}

export function parityBandFor(index: number): ParityBand {
  if (index >= 95) return 'equivalent';
  if (index >= 85) return 'minor_inconsistency';
  if (index >= 70) return 'material_gap';
  return 'severe_inequity';
}

export function calculateParity(pairs: readonly MatchedPair[]): ParityResult {
  const gaps: PairGap[] = [];
  let excludedPairCount = 0;

  for (const pair of pairs) {
    if (pair.englishScore === null || pair.frenchScore === null) {
      excludedPairCount += 1;
      continue;
    }
    const gap = Math.abs(pair.englishScore - pair.frenchScore);
    const weakerLocale =
      pair.englishScore === pair.frenchScore
        ? null
        : pair.englishScore < pair.frenchScore
          ? 'en-CA'
          : 'fr-CA';

    gaps.push({
      pairId: pair.pairId,
      gap,
      riskWeight: pair.riskWeight ?? 1.0,
      weakerLocale,
    });
  }

  gaps.sort((a, b) => b.gap - a.gap);

  const validPairCount = gaps.length;
  const largestGap = gaps[0] ?? null;

  if (validPairCount < MINIMUM_MATCHED_PAIRS) {
    return {
      parityIndex: null,
      band: null,
      qualitativeOnly: true,
      validPairCount,
      excludedPairCount,
      gaps,
      largestGap,
    };
  }

  const weightSum = gaps.reduce((sum, g) => sum + g.riskWeight, 0);
  const weightedGap =
    gaps.reduce((sum, g) => sum + g.gap * g.riskWeight, 0) / weightSum;

  // Gaps are bounded to [0, 100] by construction, so the index cannot go
  // negative; the clamp documents that invariant rather than hiding a bug.
  const parityIndex = Math.max(0, Math.min(100, 100 - weightedGap));

  return {
    parityIndex,
    band: parityBandFor(parityIndex),
    qualitativeOnly: false,
    validPairCount,
    excludedPairCount,
    gaps,
    largestGap,
  };
}
