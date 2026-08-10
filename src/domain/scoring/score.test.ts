import { describe, expect, it } from 'vitest';

import { DEFAULT_DIMENSION_WEIGHTS, ScoringError, type DimensionResult } from './dimensions';
import {
  calculateCaseScore,
  calculateRunScore,
  determineScoreCap,
  gradeForScore,
  MAX_UNSCORABLE_RATIO,
  type CaseScoreInput,
  type FindingForCap,
} from './score';

/** Builds a full set of dimension results all at the same score. */
function allDimensionsAt(score: number): DimensionResult[] {
  return (Object.keys(DEFAULT_DIMENSION_WEIGHTS) as (keyof typeof DEFAULT_DIMENSION_WEIGHTS)[]).map(
    (dimension) => ({ dimension, score }),
  );
}

function perfectCase(caseId: string, riskWeight?: number): CaseScoreInput {
  return riskWeight === undefined
    ? { caseId, dimensions: allDimensionsAt(5) }
    : { caseId, dimensions: allDimensionsAt(5), riskWeight };
}

describe('calculateCaseScore (PRD 10.4)', () => {
  it('scores a flawless case at 100', () => {
    const result = calculateCaseScore({ caseId: 'c1', dimensions: allDimensionsAt(5) });
    expect(result.score).toBe(100);
    expect(result.unscorable).toBe(false);
    expect(result.applicableWeightTotal).toBe(100);
  });

  it('scores a total failure at 0', () => {
    const result = calculateCaseScore({ caseId: 'c1', dimensions: allDimensionsAt(0) });
    expect(result.score).toBe(0);
  });

  it('scores a uniformly "acceptable" case at 60', () => {
    // 3/5 of every weight = 60% of the total weight.
    const result = calculateCaseScore({ caseId: 'c1', dimensions: allDimensionsAt(3) });
    expect(result.score).toBe(60);
  });

  it('applies the documented weighting rather than a flat average', () => {
    // Only factual accuracy fails; it carries the heaviest weight (25).
    const dimensions = allDimensionsAt(5).map((result) =>
      result.dimension === 'factual_policy_accuracy' ? { ...result, score: 0 } : result,
    );

    const result = calculateCaseScore({ caseId: 'c1', dimensions });

    // 75 of 100 weight scores full marks => 75.
    expect(result.score).toBe(75);
    // A flat average over 7 dimensions would have been ~85.71.
    expect(result.score).not.toBeCloseTo(85.71, 1);
  });

  it('excludes N/A dimensions from the denominator (PRD 10.3)', () => {
    const dimensions: DimensionResult[] = allDimensionsAt(5).map((result) =>
      result.dimension === 'escalation_handoff'
        ? { dimension: result.dimension, score: null, notApplicableReason: 'No handoff in scope.' }
        : result,
    );

    const result = calculateCaseScore({ caseId: 'c1', dimensions });

    // Still 100: the remaining dimensions were all perfect.
    expect(result.score).toBe(100);
    expect(result.applicableWeightTotal).toBe(90);
    expect(result.applicableDimensions).toHaveLength(6);
  });

  it('rejects an N/A dimension with no documented reason', () => {
    expect(() =>
      calculateCaseScore({
        caseId: 'c1',
        dimensions: [{ dimension: 'empathy_tone', score: null }],
      }),
    ).toThrow(ScoringError);
  });

  it('rejects out-of-range and non-integer scores', () => {
    expect(() =>
      calculateCaseScore({ caseId: 'c1', dimensions: [{ dimension: 'empathy_tone', score: 6 }] }),
    ).toThrow(/outside 0-5/);

    expect(() =>
      calculateCaseScore({ caseId: 'c1', dimensions: [{ dimension: 'empathy_tone', score: 3.5 }] }),
    ).toThrow(/integer/);
  });

  it('rejects a duplicated dimension', () => {
    expect(() =>
      calculateCaseScore({
        caseId: 'c1',
        dimensions: [
          { dimension: 'empathy_tone', score: 5 },
          { dimension: 'empathy_tone', score: 1 },
        ],
      }),
    ).toThrow(/more than once/);
  });

  it('refuses to score a case where every dimension is N/A', () => {
    const dimensions: DimensionResult[] = allDimensionsAt(5).map((result) => ({
      dimension: result.dimension,
      score: null,
      notApplicableReason: 'Out of scope.',
    }));

    // Scoring this as 0 would look like a failure rather than an absence.
    expect(() => calculateCaseScore({ caseId: 'c1', dimensions })).toThrow(
      /no applicable dimensions/,
    );
  });

  it('requires a reason for an unscorable case', () => {
    expect(() => calculateCaseScore({ caseId: 'c1', dimensions: [], unscorable: true })).toThrow(
      /without a documented reason/,
    );
  });

  it('returns a null score for a documented unscorable case', () => {
    const result = calculateCaseScore({
      caseId: 'c1',
      dimensions: [],
      unscorable: true,
      unscorableReason: 'Endpoint timed out on every attempt.',
    });

    expect(result.score).toBeNull();
    expect(result.unscorable).toBe(true);
  });

  it('rejects a risk weight the PRD does not permit', () => {
    expect(() => calculateCaseScore({ ...perfectCase('c1'), riskWeight: 3.0 })).toThrow(
      /not permitted/,
    );
  });

  it.each([1.0, 1.5, 2.0])('accepts the permitted risk weight %s', (riskWeight) => {
    expect(calculateCaseScore(perfectCase('c1', riskWeight)).riskWeight).toBe(riskWeight);
  });
});

describe('gradeForScore (PRD 10.5)', () => {
  it.each([
    [100, 'A'],
    [90, 'A'],
    [89.99, 'B'],
    [80, 'B'],
    [79.9, 'C'],
    [70, 'C'],
    [69.5, 'D'],
    [60, 'D'],
    [59.99, 'F'],
    [0, 'F'],
  ])('grades %s as %s', (score, grade) => {
    expect(gradeForScore(score)).toBe(grade);
  });
});

describe('determineScoreCap (PRD 10.6)', () => {
  const criticalConfirmed: FindingForCap = {
    id: 'f1',
    severity: 'critical',
    status: 'open',
    confirmed: true,
  };

  it('returns no cap for an empty finding list', () => {
    expect(determineScoreCap([])).toBeNull();
  });

  it('caps at 49/F for a confirmed critical finding', () => {
    const cap = determineScoreCap([criticalConfirmed]);
    expect(cap?.maxScore).toBe(49);
    expect(cap?.forcedGrade).toBe('F');
    expect(cap?.triggeredByFindingIds).toEqual(['f1']);
  });

  it('does not cap on an unconfirmed critical candidate', () => {
    // PRD 10.6 says "confirmed Critical finding". An AI-proposed critical that
    // an analyst has not adjudicated must not silently fail the customer.
    expect(determineScoreCap([{ ...criticalConfirmed, confirmed: false }])).toBeNull();
  });

  it('caps at 69/D for an unresolved high finding in a key dimension', () => {
    const cap = determineScoreCap([
      {
        id: 'f2',
        severity: 'high',
        status: 'open',
        dimension: 'safety_privacy',
        confirmed: true,
      },
    ]);

    expect(cap?.maxScore).toBe(69);
    expect(cap?.forcedGrade).toBe('D');
  });

  it('does not cap on a high finding outside the named dimensions', () => {
    expect(
      determineScoreCap([
        { id: 'f3', severity: 'high', status: 'open', dimension: 'empathy_tone', confirmed: true },
      ]),
    ).toBeNull();
  });

  it('does not cap on a resolved high finding', () => {
    expect(
      determineScoreCap([
        {
          id: 'f4',
          severity: 'high',
          status: 'resolved',
          dimension: 'safety_privacy',
          confirmed: true,
        },
      ]),
    ).toBeNull();
  });

  it('treats risk_accepted as still unresolved', () => {
    // FR-FND-004: accepting risk does not remove the historical finding.
    const cap = determineScoreCap([
      {
        id: 'f5',
        severity: 'high',
        status: 'risk_accepted',
        dimension: 'factual_policy_accuracy',
        confirmed: true,
      },
    ]);

    expect(cap?.maxScore).toBe(69);
  });

  it('prefers the critical cap when both apply', () => {
    const cap = determineScoreCap([
      criticalConfirmed,
      {
        id: 'f6',
        severity: 'high',
        status: 'open',
        dimension: 'safety_privacy',
        confirmed: true,
      },
    ]);

    expect(cap?.maxScore).toBe(49);
    expect(cap?.reason).toBe('confirmed_critical_finding');
  });
});

describe('calculateRunScore (PRD 10.4, 10.6)', () => {
  it('averages case scores', () => {
    const result = calculateRunScore({
      cases: [
        { caseId: 'c1', dimensions: allDimensionsAt(5) }, // 100
        { caseId: 'c2', dimensions: allDimensionsAt(3) }, // 60
      ],
    });

    expect(result.score).toBe(80);
    expect(result.grade).toBe('B');
    expect(result.status).toBe('complete');
  });

  it('weights case scores by scenario risk weight', () => {
    const result = calculateRunScore({
      cases: [
        { caseId: 'c1', dimensions: allDimensionsAt(5), riskWeight: 2.0 }, // 100 x2
        { caseId: 'c2', dimensions: allDimensionsAt(0), riskWeight: 1.0 }, // 0 x1
      ],
    });

    // (100*2 + 0*1) / 3 = 66.67
    expect(result.score).toBeCloseTo(66.67, 2);
  });

  it('throws when a run has no cases', () => {
    expect(() => calculateRunScore({ cases: [] })).toThrow(/at least one case/);
  });

  it('excludes unscorable cases from the average', () => {
    const result = calculateRunScore({
      cases: [
        { caseId: 'c1', dimensions: allDimensionsAt(5) },
        { caseId: 'c2', dimensions: [], unscorable: true, unscorableReason: 'Timeout.' },
      ],
    });

    // 1 of 2 unscorable is 50%, above the 20% threshold => incomplete.
    expect(result.status).toBe('incomplete');
    expect(result.score).toBeNull();
    expect(result.grade).toBeNull();
    // The raw number is still computed so the analyst can see it internally.
    expect(result.rawScore).toBe(100);
  });

  it('stays complete when unscorable cases are within the threshold', () => {
    const cases: CaseScoreInput[] = [
      ...Array.from({ length: 9 }, (_unused, index) => perfectCase(`c${index}`)),
      { caseId: 'c9', dimensions: [], unscorable: true, unscorableReason: 'Timeout.' },
    ];

    const result = calculateRunScore({ cases });

    expect(result.unscorableRatio).toBeCloseTo(0.1, 5);
    expect(result.unscorableRatio).toBeLessThanOrEqual(MAX_UNSCORABLE_RATIO);
    expect(result.status).toBe('complete');
    expect(result.score).toBe(100);
  });

  it('grades an over-threshold run only with an owner-approved exception', () => {
    const cases: CaseScoreInput[] = [
      perfectCase('c0'),
      { caseId: 'c1', dimensions: [], unscorable: true, unscorableReason: 'No access.' },
    ];

    const withoutException = calculateRunScore({ cases });
    expect(withoutException.status).toBe('incomplete');

    const withException = calculateRunScore({
      cases,
      ownerApprovedIncompleteException: {
        approvedByUserId: 'owner-1',
        reason: 'Customer accepted partial coverage in writing.',
      },
    });

    expect(withException.status).toBe('complete');
    expect(withException.score).toBe(100);
    expect(withException.incompleteExceptionApplied).toBe(true);
  });

  it('stays ungraded when every case is unscorable, exception or not', () => {
    const result = calculateRunScore({
      cases: [{ caseId: 'c1', dimensions: [], unscorable: true, unscorableReason: 'No access.' }],
      ownerApprovedIncompleteException: {
        approvedByUserId: 'owner-1',
        reason: 'Customer accepted partial coverage.',
      },
    });

    // There is nothing to average. An exception cannot manufacture a score.
    expect(result.status).toBe('incomplete');
    expect(result.score).toBeNull();
  });

  it('applies the critical cap to an otherwise excellent run', () => {
    const result = calculateRunScore({
      cases: [perfectCase('c1')],
      findings: [{ id: 'f1', severity: 'critical', status: 'open', confirmed: true }],
    });

    expect(result.rawScore).toBe(100);
    expect(result.score).toBe(49);
    expect(result.grade).toBe('F');
    expect(result.cap?.reason).toBe('confirmed_critical_finding');
  });

  it('never raises a score that is already below the cap', () => {
    const result = calculateRunScore({
      cases: [{ caseId: 'c1', dimensions: allDimensionsAt(1) }], // 20
      findings: [{ id: 'f1', severity: 'critical', status: 'open', confirmed: true }],
    });

    expect(result.rawScore).toBe(20);
    expect(result.score).toBe(20);
    // The cap is still reported, because PRD 10.6 requires the reason visible.
    expect(result.cap).not.toBeNull();
    expect(result.grade).toBe('F');
  });
});
