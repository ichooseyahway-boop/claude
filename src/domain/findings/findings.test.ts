import { describe, expect, it } from 'vitest';
import {
  FINDING_STATUSES,
  SEVERITIES,
  canChangeFindingStatus,
  canReleaseFinding,
  compareSeverity,
  planCriticalAlert,
  publishableSeverity,
  requiredReview,
  type FindingCandidate,
  type FindingStatus,
} from './findings';

const base: FindingCandidate = {
  severity: 'medium',
  dimension: 'resolution_effectiveness',
  confidence: 'high',
  hasPolicySupport: true,
  evaluatorDisagreement: false,
  humanConfirmed: false,
  seniorConfirmed: false,
};

describe('severity and status vocabularies', () => {
  it('matches the PRD severity levels in order', () => {
    expect([...SEVERITIES]).toEqual([
      'critical',
      'high',
      'medium',
      'low',
      'observation',
    ]);
  });

  it('matches the PRD remediation statuses', () => {
    expect([...FINDING_STATUSES]).toEqual([
      'open',
      'accepted',
      'in_progress',
      'ready_for_retest',
      'resolved',
      'partially_resolved',
      'risk_accepted',
      'not_applicable',
      'regressed',
    ]);
  });

  it('sorts most severe first', () => {
    const sorted = ['low', 'critical', 'medium'].sort((a, b) =>
      compareSeverity(a as 'low', b as 'low'),
    );
    expect(sorted).toEqual(['critical', 'medium', 'low']);
  });
});

describe('requiredReview', () => {
  it('always sends Critical candidates to a senior reviewer', () => {
    expect(requiredReview({ ...base, severity: 'critical' })).toBe(
      'senior_confirmation',
    );
  });

  it('escalates a low-confidence High to senior review', () => {
    expect(
      requiredReview({ ...base, severity: 'high', confidence: 'low' }),
    ).toBe('senior_confirmation');
  });

  it('escalates a High privacy finding to senior review', () => {
    expect(
      requiredReview({
        ...base,
        severity: 'high',
        dimension: 'safety_and_privacy',
      }),
    ).toBe('senior_confirmation');
  });

  it('escalates a High fairness finding to senior review', () => {
    expect(
      requiredReview({ ...base, severity: 'high', isFairnessFinding: true }),
    ).toBe('senior_confirmation');
  });

  it('still requires analyst confirmation for the mildest observation', () => {
    // FR-EVAL-001 makes analyst review mandatory; nothing is auto-published.
    expect(requiredReview({ ...base, severity: 'observation' })).toBe(
      'analyst_confirmation',
    );
  });
});

describe('canReleaseFinding', () => {
  it('never releases an unreviewed candidate', () => {
    expect(canReleaseFinding(base)).toBe(false);
  });

  it('releases a medium finding after analyst confirmation', () => {
    expect(canReleaseFinding({ ...base, humanConfirmed: true })).toBe(true);
  });

  it('does not accept analyst confirmation alone for a Critical', () => {
    expect(
      canReleaseFinding({
        ...base,
        severity: 'critical',
        humanConfirmed: true,
      }),
    ).toBe(false);

    expect(
      canReleaseFinding({
        ...base,
        severity: 'critical',
        seniorConfirmed: true,
      }),
    ).toBe(true);
  });
});

describe('publishableSeverity', () => {
  it('downgrades an unconfirmed low-confidence Critical', () => {
    // PRD 10.8: "Low-confidence findings cannot be Critical without senior
    // human confirmation."
    expect(
      publishableSeverity({
        ...base,
        severity: 'critical',
        confidence: 'low',
      }),
    ).toBe('high');
  });

  it('keeps Critical once a senior reviewer confirms it', () => {
    expect(
      publishableSeverity({
        ...base,
        severity: 'critical',
        confidence: 'low',
        seniorConfirmed: true,
      }),
    ).toBe('critical');
  });

  it('leaves a high-confidence Critical alone', () => {
    expect(
      publishableSeverity({ ...base, severity: 'critical', confidence: 'high' }),
    ).toBe('critical');
  });
});

describe('planCriticalAlert', () => {
  it('never puts evidence in the internal alert', () => {
    // FR-FND-003: "Critical candidates do not automatically email detailed
    // sensitive evidence."
    const plan = planCriticalAlert({ ...base, severity: 'critical' });
    expect(plan.notifyInternal).toBe(true);
    expect(plan.internalPayloadIncludesEvidence).toBe(false);
  });

  it('holds the customer notice until a human has confirmed', () => {
    const unconfirmed = planCriticalAlert({ ...base, severity: 'critical' });
    expect(unconfirmed.notifyCustomer).toBe(false);
    expect(unconfirmed.requiresHumanApprovalBeforeCustomerNotice).toBe(true);

    const confirmed = planCriticalAlert({
      ...base,
      severity: 'critical',
      seniorConfirmed: true,
    });
    expect(confirmed.notifyCustomer).toBe(true);
    expect(confirmed.customerPayloadSanitized).toBe(true);
  });

  it('does not raise a critical alert for lesser severities', () => {
    expect(planCriticalAlert({ ...base, severity: 'high' }).notifyInternal).toBe(
      false,
    );
  });
});

describe('canChangeFindingStatus', () => {
  it('follows the documented remediation path', () => {
    const path: Array<[FindingStatus, FindingStatus]> = [
      ['open', 'accepted'],
      ['accepted', 'in_progress'],
      ['in_progress', 'ready_for_retest'],
    ];
    for (const [from, to] of path) {
      expect(
        canChangeFindingStatus({ from, to, actorRole: 'client_owner' }).allowed,
        `${from} -> ${to}`,
      ).toBe(true);
    }
  });

  it('rejects an undefined transition', () => {
    expect(
      canChangeFindingStatus({
        from: 'open',
        to: 'resolved',
        actorRole: 'analyst',
      }),
    ).toMatchObject({ allowed: false, code: 'INVALID_STATUS_TRANSITION' });
  });

  it('does not let a customer mark their own finding resolved', () => {
    expect(
      canChangeFindingStatus({
        from: 'ready_for_retest',
        to: 'resolved',
        actorRole: 'client_owner',
      }),
    ).toMatchObject({
      allowed: false,
      code: 'RETEST_RESULT_REQUIRES_INTERNAL_ROLE',
    });

    expect(
      canChangeFindingStatus({
        from: 'ready_for_retest',
        to: 'resolved',
        actorRole: 'analyst',
      }).allowed,
    ).toBe(true);
  });

  it('requires Client Owner identity, reason and review date for risk acceptance', () => {
    expect(
      canChangeFindingStatus({
        from: 'open',
        to: 'risk_accepted',
        actorRole: 'client_contributor',
        reason: 'Accepted by the business.',
        reviewDate: new Date('2027-01-01T00:00:00Z'),
      }),
    ).toMatchObject({ code: 'RISK_ACCEPTANCE_REQUIRES_CLIENT_OWNER' });

    expect(
      canChangeFindingStatus({
        from: 'open',
        to: 'risk_accepted',
        actorRole: 'client_owner',
        reason: 'Accepted by the business.',
      }),
    ).toMatchObject({ code: 'RISK_ACCEPTANCE_REQUIRES_REVIEW_DATE' });

    expect(
      canChangeFindingStatus({
        from: 'open',
        to: 'risk_accepted',
        actorRole: 'client_owner',
        reviewDate: new Date('2027-01-01T00:00:00Z'),
      }),
    ).toMatchObject({ code: 'REASON_REQUIRED' });

    expect(
      canChangeFindingStatus({
        from: 'open',
        to: 'risk_accepted',
        actorRole: 'client_owner',
        reason: 'Accepted pending platform migration.',
        reviewDate: new Date('2027-01-01T00:00:00Z'),
      }).allowed,
    ).toBe(true);
  });

  it('allows a resolved finding to regress in a later cycle', () => {
    expect(
      canChangeFindingStatus({
        from: 'resolved',
        to: 'regressed',
        actorRole: 'analyst',
      }).allowed,
    ).toBe(true);
  });
});
