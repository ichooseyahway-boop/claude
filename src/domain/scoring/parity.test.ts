import { describe, expect, it } from 'vitest';

import {
  calculateParityIndex,
  MIN_MATCHED_PAIRS_FOR_PARITY,
  parityBandFor,
  type MatchedPairInput,
} from './parity';

/** Builds `count` pairs whose English/French scores differ by `gap`. */
function pairsWithGap(count: number, gap: number): MatchedPairInput[] {
  return Array.from({ length: count }, (_unused, index) => ({
    pairId: `pair-${index}`,
    englishScore: 90,
    frenchScore: 90 - gap,
  }));
}

describe('parityBandFor (PRD 10.7)', () => {
  it.each([
    [100, 'equivalent'],
    [95, 'equivalent'],
    [94.9, 'minor_inconsistency'],
    [85, 'minor_inconsistency'],
    [84.9, 'material_language_gap'],
    [70, 'material_language_gap'],
    [69.9, 'severe_language_inequity'],
    [0, 'severe_language_inequity'],
  ])('places %s in band %s', (index, band) => {
    expect(parityBandFor(index)).toBe(band);
  });
});

describe('calculateParityIndex (PRD 10.7)', () => {
  it('refuses to issue a number below ten matched pairs', () => {
    const outcome = calculateParityIndex(pairsWithGap(9, 5));

    expect(outcome.kind).toBe('qualitative_only');
    if (outcome.kind !== 'qualitative_only') throw new Error('unreachable');

    expect(outcome.reason).toBe('insufficient_matched_pairs');
    expect(outcome.validPairCount).toBe(9);
    expect(outcome.requiredPairCount).toBe(MIN_MATCHED_PAIRS_FOR_PARITY);
    // The gaps are still returned so the report can describe them in words.
    expect(outcome.pairGaps).toHaveLength(9);
  });

  it('issues a number at exactly ten matched pairs', () => {
    const outcome = calculateParityIndex(pairsWithGap(10, 0));

    expect(outcome.kind).toBe('scored');
    if (outcome.kind !== 'scored') throw new Error('unreachable');

    expect(outcome.parityIndex).toBe(100);
    expect(outcome.band).toBe('equivalent');
  });

  it('computes 100 minus the mean gap', () => {
    const outcome = calculateParityIndex(pairsWithGap(10, 12));

    if (outcome.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(outcome.parityIndex).toBe(88);
    expect(outcome.band).toBe('minor_inconsistency');
  });

  it('is direction-agnostic: a French advantage is still a gap', () => {
    const englishWeaker = calculateParityIndex(
      Array.from({ length: 10 }, (_unused, index) => ({
        pairId: `p${index}`,
        englishScore: 70,
        frenchScore: 90,
      })),
    );

    if (englishWeaker.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(englishWeaker.parityIndex).toBe(80);
    expect(englishWeaker.pairGaps[0]?.weakerLocale).toBe('en-CA');
  });

  it('records which locale is weaker, and null when they tie', () => {
    const outcome = calculateParityIndex([
      { pairId: 'a', englishScore: 90, frenchScore: 70 },
      { pairId: 'b', englishScore: 80, frenchScore: 80 },
      ...pairsWithGap(8, 0),
    ]);

    if (outcome.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(outcome.pairGaps.find((pair) => pair.pairId === 'a')?.weakerLocale).toBe('fr-CA');
    expect(outcome.pairGaps.find((pair) => pair.pairId === 'b')?.weakerLocale).toBeNull();
  });

  it('discards a pair where either side is unscorable', () => {
    const outcome = calculateParityIndex([
      ...pairsWithGap(10, 0),
      { pairId: 'broken-en', englishScore: null, frenchScore: 80 },
      { pairId: 'broken-fr', englishScore: 80, frenchScore: null },
    ]);

    if (outcome.kind !== 'scored') throw new Error('expected a scored outcome');
    // Comparing a real score against a missing one would invent a 80-point gap.
    expect(outcome.validPairCount).toBe(10);
    expect(outcome.discardedPairCount).toBe(2);
    expect(outcome.parityIndex).toBe(100);
  });

  it('falls back to qualitative when discards drop it below the minimum', () => {
    const outcome = calculateParityIndex([
      ...pairsWithGap(9, 0),
      { pairId: 'broken', englishScore: null, frenchScore: 80 },
    ]);

    expect(outcome.kind).toBe('qualitative_only');
  });

  it('weights gaps by scenario risk weight', () => {
    const pairs: MatchedPairInput[] = [
      { pairId: 'high-risk', englishScore: 100, frenchScore: 0, riskWeight: 2.0 },
      ...Array.from({ length: 9 }, (_unused, index) => ({
        pairId: `p${index}`,
        englishScore: 100,
        frenchScore: 100,
        riskWeight: 1.0,
      })),
    ];

    const outcome = calculateParityIndex(pairs);
    if (outcome.kind !== 'scored') throw new Error('expected a scored outcome');

    // (100*2 + 0*9) / 11 = 18.18 mean gap => 81.82 parity.
    expect(outcome.parityIndex).toBeCloseTo(81.82, 2);
    expect(outcome.band).toBe('material_language_gap');
  });

  it('surfaces the largest gaps first for the report', () => {
    const outcome = calculateParityIndex([
      { pairId: 'worst', englishScore: 100, frenchScore: 10 },
      { pairId: 'middle', englishScore: 100, frenchScore: 60 },
      ...pairsWithGap(9, 0),
    ]);

    if (outcome.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(outcome.largestGaps[0]?.pairId).toBe('worst');
    expect(outcome.largestGaps[1]?.pairId).toBe('middle');
    expect(outcome.largestGaps.length).toBeLessThanOrEqual(5);
  });

  it('reports severe inequity when French consistently fails', () => {
    const outcome = calculateParityIndex(pairsWithGap(12, 45));

    if (outcome.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(outcome.parityIndex).toBe(55);
    expect(outcome.band).toBe('severe_language_inequity');
  });

  it('returns a qualitative outcome for an empty pair list', () => {
    const outcome = calculateParityIndex([]);
    expect(outcome.kind).toBe('qualitative_only');
  });
});
