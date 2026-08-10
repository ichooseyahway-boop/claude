/**
 * Bilingual parity index (PRD 10.7).
 *
 * Compares matched English/French case pairs. The rule that matters most here
 * is the minimum-pairs rule: below ten valid matched pairs, no numeric parity
 * score may be issued at all, and the report shows a qualitative assessment
 * instead. Publishing a parity number off three pairs would be the kind of
 * false precision PRD 10.1 requires the methodology to avoid.
 */

export const MIN_MATCHED_PAIRS_FOR_PARITY = 10;

export interface MatchedPairInput {
  readonly pairId: string;
  /** Approved English case score, 0-100. `null` when the case was unscorable. */
  readonly englishScore: number | null;
  /** Approved French case score, 0-100. `null` when the case was unscorable. */
  readonly frenchScore: number | null;
  /** Scenario risk weight, matching the run scoring weights. Default 1.0. */
  readonly riskWeight?: number;
}

export interface PairGap {
  readonly pairId: string;
  readonly englishScore: number;
  readonly frenchScore: number;
  readonly gap: number;
  readonly riskWeight: number;
  /** Which locale scored lower — the direction of the inequity. */
  readonly weakerLocale: 'en-CA' | 'fr-CA' | null;
}

export type ParityBand =
  | 'equivalent'
  | 'minor_inconsistency'
  | 'material_language_gap'
  | 'severe_language_inequity';

export type ParityOutcome =
  | {
      readonly kind: 'scored';
      readonly parityIndex: number;
      readonly band: ParityBand;
      readonly validPairCount: number;
      readonly discardedPairCount: number;
      readonly pairGaps: readonly PairGap[];
      /** Largest gaps first — the pairs worth showing in the report. */
      readonly largestGaps: readonly PairGap[];
    }
  | {
      readonly kind: 'qualitative_only';
      readonly reason: 'insufficient_matched_pairs';
      readonly validPairCount: number;
      readonly discardedPairCount: number;
      readonly requiredPairCount: number;
      readonly pairGaps: readonly PairGap[];
    };

/** PRD 10.7 parity bands. */
export function parityBandFor(parityIndex: number): ParityBand {
  if (parityIndex >= 95) return 'equivalent';
  if (parityIndex >= 85) return 'minor_inconsistency';
  if (parityIndex >= 70) return 'material_language_gap';
  return 'severe_language_inequity';
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Computes the parity index.
 *
 * ```text
 * pair_gap = |english_case_score - french_case_score|
 * parity_index = 100 - weighted_average(pair_gap)
 * ```
 *
 * A pair where either side is unscorable is not a valid pair and is discarded
 * — comparing a real score against a missing one would invent a gap.
 */
export function calculateParityIndex(pairs: readonly MatchedPairInput[]): ParityOutcome {
  const pairGaps: PairGap[] = [];
  let discarded = 0;

  for (const pair of pairs) {
    if (pair.englishScore === null || pair.frenchScore === null) {
      discarded += 1;
      continue;
    }

    const gap = round2(Math.abs(pair.englishScore - pair.frenchScore));

    pairGaps.push({
      pairId: pair.pairId,
      englishScore: pair.englishScore,
      frenchScore: pair.frenchScore,
      gap,
      riskWeight: pair.riskWeight ?? 1.0,
      weakerLocale:
        pair.englishScore === pair.frenchScore
          ? null
          : pair.englishScore < pair.frenchScore
            ? 'en-CA'
            : 'fr-CA',
    });
  }

  if (pairGaps.length < MIN_MATCHED_PAIRS_FOR_PARITY) {
    return {
      kind: 'qualitative_only',
      reason: 'insufficient_matched_pairs',
      validPairCount: pairGaps.length,
      discardedPairCount: discarded,
      requiredPairCount: MIN_MATCHED_PAIRS_FOR_PARITY,
      pairGaps,
    };
  }

  let weightedGapTotal = 0;
  let weightTotal = 0;

  for (const pairGap of pairGaps) {
    weightedGapTotal += pairGap.gap * pairGap.riskWeight;
    weightTotal += pairGap.riskWeight;
  }

  const weightedAverageGap = weightedGapTotal / weightTotal;
  // Clamped at zero: a mean gap above 100 is not reachable with 0-100 scores,
  // but a negative parity index would be meaningless if it ever were.
  const parityIndex = round2(Math.max(0, 100 - weightedAverageGap));

  const largestGaps = [...pairGaps].sort((a, b) => b.gap - a.gap).slice(0, 5);

  return {
    kind: 'scored',
    parityIndex,
    band: parityBandFor(parityIndex),
    validPairCount: pairGaps.length,
    discardedPairCount: discarded,
    pairGaps,
    largestGaps,
  };
}
