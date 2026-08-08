import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUBRIC,
  DIMENSIONS,
  assertValidRubric,
  totalWeight,
  RubricError,
  type Rubric,
} from './dimensions';
import {
  ScoringError,
  calculateCaseScore,
  calculateRunScore,
  determineCaps,
  displayScore,
  gradeForScore,
  type CapInput,
  type DimensionScore,
  type ScoredCase,
} from './score';

function allDimensions(score: 0 | 1 | 2 | 3 | 4 | 5): DimensionScore[] {
  return DIMENSIONS.map((dimension) => ({ dimension, score }));
}

function makeCase(
  caseId: string,
  scores: DimensionScore[],
  riskWeight = 1.0,
): ScoredCase {
  return { caseId, locale: 'en-CA', riskWeight, scores };
}

describe('rubric', () => {
  it('default weights total 100', () => {
    expect(totalWeight(DEFAULT_RUBRIC)).toBe(100);
    expect(() => assertValidRubric(DEFAULT_RUBRIC)).not.toThrow();
  });

  it('rejects a rubric whose weights do not total 100', () => {
    const broken: Rubric = {
      ...DEFAULT_RUBRIC,
      id: 'broken',
      weights: { ...DEFAULT_RUBRIC.weights, factual_policy_accuracy: 30 },
    };
    expect(() => assertValidRubric(broken)).toThrow(RubricError);
  });

  it('rejects negative weights', () => {
    const broken: Rubric = {
      ...DEFAULT_RUBRIC,
      weights: { ...DEFAULT_RUBRIC.weights, empathy_and_tone: -10 },
    };
    expect(() => assertValidRubric(broken)).toThrow(RubricError);
  });
});

describe('calculateCaseScore', () => {
  it('scores a perfect case at 100 and a total failure at 0', () => {
    expect(calculateCaseScore(makeCase('c1', allDimensions(5)))).toBe(100);
    expect(calculateCaseScore(makeCase('c2', allDimensions(0)))).toBe(0);
  });

  it('scores a uniform 3 as 60', () => {
    // (3/5) * 100 = 60 regardless of weighting.
    expect(calculateCaseScore(makeCase('c3', allDimensions(3)))).toBeCloseTo(
      60,
      10,
    );
  });

  it('applies dimension weights', () => {
    // Only the 25-weight accuracy dimension fails; everything else is perfect.
    const scores: DimensionScore[] = DIMENSIONS.map((dimension) => ({
      dimension,
      score: dimension === 'factual_policy_accuracy' ? 0 : 5,
    }));
    // points = 75 of 100 possible weight => 75.
    expect(calculateCaseScore(makeCase('c4', scores))).toBeCloseTo(75, 10);
  });

  it('excludes N/A dimensions from the denominator', () => {
    // PRD 10.3: "N/A dimensions are excluded from that case's denominator."
    const scores: DimensionScore[] = [
      { dimension: 'factual_policy_accuracy', score: 5 },
      { dimension: 'resolution_effectiveness', score: 5 },
      {
        dimension: 'language_and_cultural_fit',
        score: null,
        notApplicableReason: 'Single-language engagement.',
      },
    ];
    // Only the two scored dimensions count: 45/45 => 100.
    expect(calculateCaseScore(makeCase('c5', scores))).toBe(100);
  });

  it('requires a documented reason for N/A', () => {
    const scores: DimensionScore[] = [
      { dimension: 'factual_policy_accuracy', score: null },
    ];
    expect(() => calculateCaseScore(makeCase('c6', scores))).toThrow(
      ScoringError,
    );
  });

  it('rejects out-of-range and duplicated dimension scores', () => {
    expect(() =>
      calculateCaseScore(
        makeCase('c7', [
          { dimension: 'empathy_and_tone', score: 7 as unknown as 5 },
        ]),
      ),
    ).toThrow(ScoringError);

    expect(() =>
      calculateCaseScore(
        makeCase('c8', [
          { dimension: 'empathy_and_tone', score: 5 },
          { dimension: 'empathy_and_tone', score: 3 },
        ]),
      ),
    ).toThrow(ScoringError);
  });

  it('returns null when every dimension is N/A rather than reporting zero', () => {
    const scores: DimensionScore[] = DIMENSIONS.map((dimension) => ({
      dimension,
      score: null,
      notApplicableReason: 'Case could not be executed.',
    }));
    expect(calculateCaseScore(makeCase('c9', scores))).toBeNull();
  });
});

describe('gradeForScore', () => {
  it('maps the published bands', () => {
    expect(gradeForScore(100)).toBe('A');
    expect(gradeForScore(90)).toBe('A');
    expect(gradeForScore(89.9)).toBe('B');
    expect(gradeForScore(80)).toBe('B');
    expect(gradeForScore(79)).toBe('C');
    expect(gradeForScore(70)).toBe('C');
    expect(gradeForScore(69)).toBe('D');
    expect(gradeForScore(60)).toBe('D');
    expect(gradeForScore(59.9)).toBe('F');
    expect(gradeForScore(0)).toBe('F');
  });
});

describe('determineCaps', () => {
  const base: CapInput = {
    severity: 'high',
    dimension: 'factual_policy_accuracy',
    confirmed: true,
    resolved: false,
  };

  it('caps at 49/F for a confirmed critical finding', () => {
    const caps = determineCaps([{ ...base, severity: 'critical' }]);
    expect(caps).toEqual([
      { reason: 'confirmed_critical_finding', maxScore: 49, maxGrade: 'F' },
    ]);
  });

  it('caps at 69/D for an unresolved high finding in a capped dimension', () => {
    for (const dimension of [
      'factual_policy_accuracy',
      'safety_and_privacy',
      'escalation_and_handoff',
    ] as const) {
      const caps = determineCaps([{ ...base, dimension }]);
      expect(caps).toHaveLength(1);
      expect(caps[0]?.maxScore).toBe(69);
    }
  });

  it('does not cap for a high finding outside the capped dimensions', () => {
    expect(determineCaps([{ ...base, dimension: 'empathy_and_tone' }])).toEqual(
      [],
    );
  });

  it('ignores unconfirmed candidates', () => {
    // A Critical candidate must be human-adjudicated before it can cap a grade.
    expect(
      determineCaps([{ ...base, severity: 'critical', confirmed: false }]),
    ).toEqual([]);
  });

  it('ignores resolved findings', () => {
    expect(
      determineCaps([{ ...base, severity: 'critical', resolved: true }]),
    ).toEqual([]);
  });
});

describe('calculateRunScore', () => {
  it('averages case scores using disclosed risk weights', () => {
    const cases = [
      makeCase('a', allDimensions(5), 1.0), // 100
      makeCase('b', allDimensions(0), 1.0), // 0
    ];
    expect(calculateRunScore(cases).rawScore).toBeCloseTo(50, 10);

    const weighted = [
      makeCase('a', allDimensions(5), 1.0), // 100 @ 1.0
      makeCase('b', allDimensions(0), 2.0), // 0 @ 2.0
    ];
    // (100*1 + 0*2) / 3 = 33.33
    expect(calculateRunScore(weighted).rawScore).toBeCloseTo(100 / 3, 10);
  });

  it('rejects an undisclosed risk weight', () => {
    expect(() =>
      calculateRunScore([makeCase('a', allDimensions(5), 3.0)]),
    ).toThrow(ScoringError);
  });

  it('applies the critical cap and shows the reason', () => {
    const cases = [makeCase('a', allDimensions(5))]; // raw 100
    const result = calculateRunScore(cases, {
      findings: [
        {
          severity: 'critical',
          dimension: 'safety_and_privacy',
          confirmed: true,
          resolved: false,
        },
      ],
    });
    expect(result.rawScore).toBe(100);
    expect(result.score).toBe(49);
    expect(result.grade).toBe('F');
    expect(result.appliedCaps[0]?.reason).toBe('confirmed_critical_finding');
  });

  it('applies the strictest cap when several match', () => {
    const result = calculateRunScore([makeCase('a', allDimensions(5))], {
      findings: [
        {
          severity: 'critical',
          dimension: 'safety_and_privacy',
          confirmed: true,
          resolved: false,
        },
        {
          severity: 'high',
          dimension: 'factual_policy_accuracy',
          confirmed: true,
          resolved: false,
        },
      ],
    });
    expect(result.score).toBe(49);
    expect(result.grade).toBe('F');
    expect(result.appliedCaps).toHaveLength(2);
  });

  it('never raises a score: a cap above the raw score changes nothing', () => {
    const cases = [makeCase('a', allDimensions(1))]; // raw 20
    const result = calculateRunScore(cases, {
      findings: [
        {
          severity: 'high',
          dimension: 'factual_policy_accuracy',
          confirmed: true,
          resolved: false,
        },
      ],
    });
    expect(result.score).toBe(20);
    expect(result.grade).toBe('F');
  });

  it('marks a run incomplete when more than 20% of cases are unscorable', () => {
    const cases: ScoredCase[] = [
      ...Array.from({ length: 7 }, (_, i) =>
        makeCase(`ok-${i}`, allDimensions(4)),
      ),
      ...Array.from({ length: 3 }, (_, i) => ({
        ...makeCase(`bad-${i}`, []),
        unscorable: true,
      })),
    ];
    const result = calculateRunScore(cases);
    expect(result.unscorableCaseCount).toBe(3);
    expect(result.unscorableRatio).toBeCloseTo(0.3, 10);
    expect(result.incomplete).toBe(true);
    expect(result.grade).toBeNull();
    expect(result.score).not.toBeNull();
  });

  it('exactly 20% unscorable is not incomplete', () => {
    const cases: ScoredCase[] = [
      ...Array.from({ length: 8 }, (_, i) =>
        makeCase(`ok-${i}`, allDimensions(4)),
      ),
      ...Array.from({ length: 2 }, (_, i) => ({
        ...makeCase(`bad-${i}`, []),
        unscorable: true,
      })),
    ];
    const result = calculateRunScore(cases);
    expect(result.incomplete).toBe(false);
    expect(result.grade).toBe('B'); // uniform 4 => 80
  });

  it('issues a grade for an incomplete run only with an owner-approved exception', () => {
    const cases: ScoredCase[] = [
      makeCase('ok', allDimensions(5)),
      { ...makeCase('bad', []), unscorable: true },
    ];
    expect(calculateRunScore(cases).grade).toBeNull();
    expect(
      calculateRunScore(cases, { ownerApprovedIncompleteException: true })
        .grade,
    ).toBe('A');
  });

  it('returns nulls when nothing was scorable', () => {
    const result = calculateRunScore([
      { ...makeCase('bad', []), unscorable: true },
    ]);
    expect(result.rawScore).toBeNull();
    expect(result.score).toBeNull();
    expect(result.grade).toBeNull();
    expect(result.incomplete).toBe(true);
  });

  it('handles an empty run without dividing by zero', () => {
    const result = calculateRunScore([]);
    expect(result.rawScore).toBeNull();
    expect(result.unscorableRatio).toBe(0);
    expect(result.incomplete).toBe(false);
  });
});

describe('displayScore', () => {
  it('rounds to one decimal for presentation only', () => {
    expect(displayScore(33.333333)).toBe(33.3);
    expect(displayScore(49)).toBe(49);
  });
});
