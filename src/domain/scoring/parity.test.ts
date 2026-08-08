import { describe, expect, it } from 'vitest';
import {
  MINIMUM_MATCHED_PAIRS,
  calculateParity,
  parityBandFor,
  type MatchedPair,
} from './parity';

function pairs(
  count: number,
  englishScore: number,
  frenchScore: number,
): MatchedPair[] {
  return Array.from({ length: count }, (_, i) => ({
    pairId: `pair-${i}`,
    englishScore,
    frenchScore,
  }));
}

describe('parityBandFor', () => {
  it('maps the published bands', () => {
    expect(parityBandFor(100)).toBe('equivalent');
    expect(parityBandFor(95)).toBe('equivalent');
    expect(parityBandFor(94)).toBe('minor_inconsistency');
    expect(parityBandFor(85)).toBe('minor_inconsistency');
    expect(parityBandFor(84)).toBe('material_gap');
    expect(parityBandFor(70)).toBe('material_gap');
    expect(parityBandFor(69)).toBe('severe_inequity');
    expect(parityBandFor(0)).toBe('severe_inequity');
  });
});

describe('calculateParity', () => {
  it('reports 100 when both languages score identically', () => {
    const result = calculateParity(pairs(10, 80, 80));
    expect(result.parityIndex).toBe(100);
    expect(result.band).toBe('equivalent');
    expect(result.qualitativeOnly).toBe(false);
  });

  it('subtracts the average gap from 100', () => {
    const result = calculateParity(pairs(10, 90, 70));
    expect(result.parityIndex).toBeCloseTo(80, 10);
    expect(result.band).toBe('material_gap');
  });

  it('refuses to publish a number below ten valid pairs', () => {
    // PRD 10.7: "No parity score is issued with fewer than ten valid matched
    // pairs; display a qualitative assessment instead."
    const result = calculateParity(pairs(MINIMUM_MATCHED_PAIRS - 1, 90, 70));
    expect(result.parityIndex).toBeNull();
    expect(result.band).toBeNull();
    expect(result.qualitativeOnly).toBe(true);
    expect(result.validPairCount).toBe(9);
  });

  it('excludes pairs where either side was unscorable', () => {
    const input: MatchedPair[] = [
      ...pairs(10, 90, 90),
      { pairId: 'timeout-en', englishScore: null, frenchScore: 90 },
      { pairId: 'timeout-fr', englishScore: 90, frenchScore: null },
    ];
    const result = calculateParity(input);
    expect(result.validPairCount).toBe(10);
    expect(result.excludedPairCount).toBe(2);
    expect(result.parityIndex).toBe(100);
  });

  it('drops below the publication threshold once exclusions are applied', () => {
    const input: MatchedPair[] = [
      ...pairs(9, 90, 90),
      { pairId: 'excluded', englishScore: null, frenchScore: 40 },
    ];
    const result = calculateParity(input);
    expect(result.validPairCount).toBe(9);
    expect(result.qualitativeOnly).toBe(true);
  });

  it('weights gaps by scenario risk weight', () => {
    const input: MatchedPair[] = [
      ...Array.from({ length: 9 }, (_, i) => ({
        pairId: `low-${i}`,
        englishScore: 90,
        frenchScore: 90,
        riskWeight: 1.0,
      })),
      {
        pairId: 'high-risk',
        englishScore: 100,
        frenchScore: 0,
        riskWeight: 2.0,
      },
    ];
    const result = calculateParity(input);
    // weighted gap = (0*9 + 100*2) / 11 = 18.18
    expect(result.parityIndex).toBeCloseTo(100 - 200 / 11, 8);
  });

  it('identifies which locale is being served worse', () => {
    const result = calculateParity([
      ...pairs(9, 90, 90),
      { pairId: 'french-worse', englishScore: 95, frenchScore: 40 },
    ]);
    expect(result.largestGap?.pairId).toBe('french-worse');
    expect(result.largestGap?.weakerLocale).toBe('fr-CA');
    expect(result.largestGap?.gap).toBe(55);
  });

  it('reports the weaker locale as English when English scores lower', () => {
    const result = calculateParity([
      { pairId: 'english-worse', englishScore: 30, frenchScore: 90 },
    ]);
    expect(result.gaps[0]?.weakerLocale).toBe('en-CA');
  });

  it('handles an empty pair set', () => {
    const result = calculateParity([]);
    expect(result.parityIndex).toBeNull();
    expect(result.qualitativeOnly).toBe(true);
    expect(result.largestGap).toBeNull();
  });

  it('never returns a negative index', () => {
    const result = calculateParity(pairs(10, 100, 0));
    expect(result.parityIndex).toBe(0);
    expect(result.band).toBe('severe_inequity');
  });
});
