import { describe, expect, it } from 'vitest';

import {
  checkEntitlement,
  checkLocaleEntitlement,
  parseEntitlement,
  REFERENCE_ENTITLEMENTS,
  type Entitlement,
  type UsageSnapshot,
} from './entitlements';

const noUsage: UsageSnapshot = {
  scenariosUsed: 0,
  reportsUsed: 0,
  retestsUsed: 0,
  systemsUsed: 0,
  userSeatsUsed: 0,
};

describe('reference package entitlements (PRD 6.1-6.4)', () => {
  it('matches the Essential Audit inclusions', () => {
    const essential = REFERENCE_ENTITLEMENTS.essential_audit;

    expect(essential.systemCount).toBe(1);
    expect(essential.locales).toEqual(['en-CA']);
    expect(essential.scenarioLimit).toBe(25);
    expect(essential.retestAllowance).toBe(0);
    expect(essential.monitoringFrequency).toBe('none');
  });

  it('matches the Bilingual Pro inclusions', () => {
    const pro = REFERENCE_ENTITLEMENTS.bilingual_pro_audit;

    expect(pro.locales).toEqual(['en-CA', 'fr-CA']);
    expect(pro.scenarioLimit).toBe(75);
    expect(pro.retestAllowance).toBe(1);
    expect(pro.retestCaseLimit).toBe(20);
  });

  it('gives Continuous Assurance monthly monitoring with a capped overage', () => {
    const subscription = REFERENCE_ENTITLEMENTS.continuous_assurance;

    expect(subscription.monitoringFrequency).toBe('monthly');
    expect(subscription.scenarioLimit).toBe(100);
    // PRD 6.3: configurable cap and paid overages, never silent unlimited use.
    expect(subscription.overagesEnabled).toBe(true);
    expect(subscription.hardScenarioCeiling).toBeGreaterThan(subscription.scenarioLimit);
  });

  it('validates every reference entitlement against the schema', () => {
    for (const entitlement of Object.values(REFERENCE_ENTITLEMENTS)) {
      expect(() => parseEntitlement(entitlement)).not.toThrow();
    }
  });
});

describe('checkEntitlement (FR-BILL-004)', () => {
  const essential = REFERENCE_ENTITLEMENTS.essential_audit;

  it('allows usage within the limit and reports what remains', () => {
    const decision = checkEntitlement(essential, { ...noUsage, scenariosUsed: 20 }, 'scenarios', 5);

    expect(decision.outcome).toBe('allowed');
    if (decision.outcome !== 'allowed') throw new Error('unreachable');
    expect(decision.remaining).toBe(0);
  });

  it('denies the request that would cross the limit', () => {
    const decision = checkEntitlement(essential, { ...noUsage, scenariosUsed: 25 }, 'scenarios', 1);

    expect(decision.outcome).toBe('denied');
    if (decision.outcome !== 'denied') throw new Error('unreachable');
    expect(decision.code).toBe('SCENARIO_LIMIT_REACHED');
  });

  it('denies a plan with no retest allowance', () => {
    const decision = checkEntitlement(essential, noUsage, 'retests');

    expect(decision.outcome).toBe('denied');
    if (decision.outcome !== 'denied') throw new Error('unreachable');
    expect(decision.code).toBe('RETEST_ALLOWANCE_EXHAUSTED');
  });

  it('denies a non-positive or fractional quantity', () => {
    for (const quantity of [0, -1, 1.5]) {
      const decision = checkEntitlement(essential, noUsage, 'scenarios', quantity);
      expect(decision.outcome).toBe('denied');
      if (decision.outcome !== 'denied') throw new Error('unreachable');
      expect(decision.code).toBe('INVALID_QUANTITY');
    }
  });

  it('does not grant an overage on a plan that disables them', () => {
    // Essential has overagesEnabled: false, so 26 scenarios is simply refused.
    const decision = checkEntitlement(essential, { ...noUsage, scenariosUsed: 25 }, 'scenarios');
    expect(decision.outcome).toBe('denied');
  });
});

describe('overage handling (PRD 6.3, 6.6)', () => {
  const subscription = REFERENCE_ENTITLEMENTS.continuous_assurance;

  it('records an overage rather than silently allowing extra usage', () => {
    const decision = checkEntitlement(
      subscription,
      { ...noUsage, scenariosUsed: 100 },
      'scenarios',
      10,
    );

    expect(decision.outcome).toBe('allowed_as_overage');
    if (decision.outcome !== 'allowed_as_overage') throw new Error('unreachable');
    expect(decision.overageQuantity).toBe(10);
  });

  it('bills only the portion above the included limit', () => {
    // 95 used, asking for 10: five are included, five are overage.
    const decision = checkEntitlement(
      subscription,
      { ...noUsage, scenariosUsed: 95 },
      'scenarios',
      10,
    );

    if (decision.outcome !== 'allowed_as_overage') throw new Error('expected an overage');
    expect(decision.overageQuantity).toBe(5);
  });

  it('refuses to exceed the hard ceiling even with overages enabled', () => {
    const decision = checkEntitlement(
      subscription,
      { ...noUsage, scenariosUsed: 199 },
      'scenarios',
      5,
    );

    expect(decision.outcome).toBe('denied');
    if (decision.outcome !== 'denied') throw new Error('unreachable');
    expect(decision.code).toBe('SCENARIO_HARD_CEILING_REACHED');
  });

  it('never grants an overage on a metric other than scenarios', () => {
    const decision = checkEntitlement(
      subscription,
      { ...noUsage, reportsUsed: subscription.reportAllowance },
      'reports',
    );

    expect(decision.outcome).toBe('denied');
  });
});

describe('checkLocaleEntitlement (PRD 6.1)', () => {
  it('refuses French on an English-only package', () => {
    const decision = checkLocaleEntitlement(REFERENCE_ENTITLEMENTS.essential_audit, ['fr-CA']);

    expect(decision.outcome).toBe('denied');
    if (decision.outcome !== 'denied') throw new Error('unreachable');
    expect(decision.code).toBe('LOCALE_NOT_ENTITLED');
  });

  it('allows both locales on a bilingual package', () => {
    const decision = checkLocaleEntitlement(REFERENCE_ENTITLEMENTS.bilingual_pro_audit, [
      'en-CA',
      'fr-CA',
    ]);

    expect(decision.outcome).toBe('allowed');
  });
});

describe('parseEntitlement', () => {
  it('rejects a blob that tries to grant unbounded scenarios', () => {
    const tampered = { ...REFERENCE_ENTITLEMENTS.essential_audit, scenarioLimit: 999_999 };
    expect(() => parseEntitlement(tampered)).toThrow();
  });

  it('rejects a blob missing a required field', () => {
    const { scenarioLimit: _removed, ...incomplete } = REFERENCE_ENTITLEMENTS.essential_audit;
    expect(() => parseEntitlement(incomplete)).toThrow();
  });

  it('rejects an unknown locale', () => {
    const tampered: unknown = {
      ...REFERENCE_ENTITLEMENTS.essential_audit,
      locales: ['es-MX'],
    };
    expect(() => parseEntitlement(tampered)).toThrow();
  });

  it('returns a typed entitlement for valid input', () => {
    const parsed: Entitlement = parseEntitlement(REFERENCE_ENTITLEMENTS.bilingual_pro_audit);
    expect(parsed.scenarioLimit).toBe(75);
  });
});
