import { describe, expect, it } from 'vitest';

import {
  analystConfirmationReasons,
  blockedCriticalReason,
  CLOSED_STATUSES,
  compareSeverityDescending,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  SEVERITY_RANK,
  type FindingSeverity,
} from './severity';

describe('severity ordering (FR-FND-002)', () => {
  it('ranks critical highest and observation lowest', () => {
    expect(SEVERITY_RANK.critical).toBeGreaterThan(SEVERITY_RANK.high);
    expect(SEVERITY_RANK.high).toBeGreaterThan(SEVERITY_RANK.medium);
    expect(SEVERITY_RANK.medium).toBeGreaterThan(SEVERITY_RANK.low);
    expect(SEVERITY_RANK.low).toBeGreaterThan(SEVERITY_RANK.observation);
  });

  it('sorts a mixed list most severe first', () => {
    const mixed: FindingSeverity[] = ['low', 'critical', 'observation', 'high', 'medium'];

    expect([...mixed].sort(compareSeverityDescending)).toEqual([
      'critical',
      'high',
      'medium',
      'low',
      'observation',
    ]);
  });

  it('ranks every declared severity', () => {
    for (const severity of FINDING_SEVERITIES) {
      expect(SEVERITY_RANK[severity]).toBeGreaterThan(0);
    }
  });

  it('treats only resolved and not_applicable as closed', () => {
    expect(CLOSED_STATUSES).toEqual(['resolved', 'not_applicable']);

    // Everything else stays open for reporting, including risk_accepted —
    // FR-FND-004 says accepting risk does not remove the finding.
    for (const status of FINDING_STATUSES) {
      if (status === 'resolved' || status === 'not_applicable') continue;
      expect(CLOSED_STATUSES).not.toContain(status);
    }
  });
});

describe('blockedCriticalReason (PRD 10.8)', () => {
  it('blocks a low-confidence critical with no senior confirmation', () => {
    const reason = blockedCriticalReason({ severity: 'critical', confidence: 'low' });

    expect(reason).not.toBeNull();
    expect(reason).toContain('senior');
  });

  it('allows it once a senior has confirmed', () => {
    expect(
      blockedCriticalReason({
        severity: 'critical',
        confidence: 'low',
        seniorConfirmedByUserId: 'user-1',
      }),
    ).toBeNull();
  });

  it('treats an explicit null confirmation as unconfirmed', () => {
    expect(
      blockedCriticalReason({
        severity: 'critical',
        confidence: 'low',
        seniorConfirmedByUserId: null,
      }),
    ).not.toBeNull();
  });

  it('does not block a medium- or high-confidence critical', () => {
    expect(blockedCriticalReason({ severity: 'critical', confidence: 'medium' })).toBeNull();
    expect(blockedCriticalReason({ severity: 'critical', confidence: 'high' })).toBeNull();
  });

  it('does not block a low-confidence finding below critical', () => {
    for (const severity of ['high', 'medium', 'low', 'observation'] as FindingSeverity[]) {
      expect(blockedCriticalReason({ severity, confidence: 'low' })).toBeNull();
    }
  });
});

describe('analystConfirmationReasons (FR-EVAL-005)', () => {
  const clean = {
    confidence: 'high',
    severity: 'medium',
    hasPolicySupport: true,
    evaluatorsDisagree: false,
    category: 'policy_accuracy',
  } as const;

  it('returns nothing for a well-supported ordinary proposal', () => {
    expect(analystConfirmationReasons(clean)).toEqual([]);
  });

  it('flags low confidence', () => {
    expect(analystConfirmationReasons({ ...clean, confidence: 'low' })).toContain('low_confidence');
  });

  it('flags missing policy support', () => {
    expect(analystConfirmationReasons({ ...clean, hasPolicySupport: false })).toContain(
      'missing_policy_support',
    );
  });

  it('flags evaluator disagreement', () => {
    expect(analystConfirmationReasons({ ...clean, evaluatorsDisagree: true })).toContain(
      'evaluator_disagreement',
    );
  });

  it('flags critical severity', () => {
    expect(analystConfirmationReasons({ ...clean, severity: 'critical' })).toContain(
      'critical_severity',
    );
  });

  it('flags privacy and bias findings regardless of confidence', () => {
    // FR-EVAL-005 singles these out even when the evaluator was confident.
    expect(
      analystConfirmationReasons({ ...clean, category: 'privacy_sensitive_information' }),
    ).toContain('privacy_or_bias_finding');

    expect(analystConfirmationReasons({ ...clean, category: 'harmful_bias' })).toContain(
      'privacy_or_bias_finding',
    );
  });

  it('accumulates every applicable reason', () => {
    const reasons = analystConfirmationReasons({
      confidence: 'low',
      severity: 'critical',
      hasPolicySupport: false,
      evaluatorsDisagree: true,
      category: 'harmful_bias',
    });

    expect(reasons).toHaveLength(5);
    expect(new Set(reasons).size).toBe(5);
  });
});
