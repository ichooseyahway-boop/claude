import { describe, expect, it } from 'vitest';
import {
  EntitlementSchema,
  checkLocaleScope,
  checkMonitoringEntitlement,
  checkRetestEligibility,
  checkUsage,
  emptyUsage,
  type Entitlement,
  type UsageSnapshot,
} from './entitlements';
import { getPackage, servicePackages } from '@/config/packages';

const essential = getPackage('essential_audit').entitlement;
const bilingualPro = getPackage('bilingual_pro_audit').entitlement;
const continuous = getPackage('continuous_assurance').entitlement;

function usageWith(partial: Partial<UsageSnapshot['consumed']>): UsageSnapshot {
  return { consumed: { ...emptyUsage().consumed, ...partial } };
}

describe('package catalogue', () => {
  it('validates every package entitlement against the schema', () => {
    for (const servicePackage of servicePackages) {
      expect(() =>
        EntitlementSchema.parse(servicePackage.entitlement),
      ).not.toThrow();
    }
  });

  it('matches the PRD reference prices and inclusions', () => {
    expect(getPackage('essential_audit').referenceAmountMinor).toBe(49_500);
    expect(getPackage('bilingual_pro_audit').referenceAmountMinor).toBe(175_000);
    expect(getPackage('continuous_assurance').referenceAmountMinor).toBe(69_900);

    expect(essential.scenariosPerCycle).toBe(25);
    expect(essential.maxPrioritizedFindings).toBe(5);
    expect(bilingualPro.scenariosPerCycle).toBe(75);
    expect(bilingualPro.maxPrioritizedFindings).toBe(15);
    expect(bilingualPro.retestScenarioLimit).toBe(20);
    expect(bilingualPro.retestWindowDays).toBe(30);
    expect(continuous.scenariosPerCycle).toBe(100);
  });

  it('keeps Enterprise out of self-serve checkout', () => {
    // Section 6.4: sales-assisted and invoiced.
    expect(getPackage('enterprise_managed').selfServeCheckout).toBe(false);
    expect(getPackage('enterprise_managed').providerPriceIdEnvVar).toBeNull();
  });

  it('rejects a malformed entitlement rather than granting an open plan', () => {
    expect(() =>
      EntitlementSchema.parse({ ...essential, scenariosPerCycle: 0 }),
    ).toThrow();
    expect(() =>
      EntitlementSchema.parse({ ...essential, localeScope: 'trilingual' }),
    ).toThrow();
  });
});

describe('checkUsage', () => {
  it('allows consumption within the plan limit', () => {
    const result = checkUsage(essential, usageWith({ scenarios: 24 }), 'scenarios');
    expect(result).toMatchObject({ allowed: true, wouldIncurOverage: false });
  });

  it('blocks the unit that would exceed a plan with no overage', () => {
    const result = checkUsage(essential, usageWith({ scenarios: 25 }), 'scenarios');
    expect(result).toMatchObject({
      allowed: false,
      code: 'ENTITLEMENT_EXHAUSTED',
    });
  });

  it('blocks a bulk request that would exceed the limit', () => {
    const result = checkUsage(
      essential,
      usageWith({ scenarios: 20 }),
      'scenarios',
      10,
    );
    expect(result.allowed).toBe(false);
  });

  it('flags overage instead of blocking when the plan permits it', () => {
    // Section 6.3 permits paid overage — but it is reported, never silent.
    const result = checkUsage(
      continuous,
      usageWith({ scenarios: 100 }),
      'scenarios',
    );
    expect(result).toMatchObject({ allowed: true, wouldIncurOverage: true });
  });

  it('reports remaining capacity for the operations UI', () => {
    const result = checkUsage(essential, usageWith({ scenarios: 10 }), 'scenarios');
    expect(result).toMatchObject({ allowed: true, remaining: 14 });
  });
});

describe('checkLocaleScope', () => {
  it('lets a single-language plan test either language', () => {
    expect(checkLocaleScope(essential, ['en-CA']).allowed).toBe(true);
    expect(checkLocaleScope(essential, ['fr-CA']).allowed).toBe(true);
  });

  it('blocks a single-language plan from testing both', () => {
    expect(checkLocaleScope(essential, ['en-CA', 'fr-CA'])).toMatchObject({
      allowed: false,
      code: 'LOCALE_NOT_ENTITLED',
    });
  });

  it('ignores duplicates in the requested set', () => {
    expect(checkLocaleScope(essential, ['en-CA', 'en-CA']).allowed).toBe(true);
  });

  it('allows both languages on a bilingual plan', () => {
    expect(checkLocaleScope(bilingualPro, ['en-CA', 'fr-CA']).allowed).toBe(
      true,
    );
  });
});

describe('checkRetestEligibility', () => {
  const released = new Date('2026-08-01T00:00:00Z');

  it('allows a retest inside the window and scenario limit', () => {
    const result = checkRetestEligibility(bilingualPro, emptyUsage(), {
      reportReleasedAt: released,
      requestedAt: new Date('2026-08-20T00:00:00Z'),
      scenarioCount: 20,
    });
    expect(result.allowed).toBe(true);
  });

  it('rejects a retest requested after the window closes', () => {
    const result = checkRetestEligibility(bilingualPro, emptyUsage(), {
      reportReleasedAt: released,
      requestedAt: new Date('2026-09-05T00:00:00Z'),
      scenarioCount: 5,
    });
    expect(result).toMatchObject({
      allowed: false,
      code: 'RETEST_WINDOW_EXPIRED',
    });
  });

  it('rejects a retest larger than the scenario limit', () => {
    const result = checkRetestEligibility(bilingualPro, emptyUsage(), {
      reportReleasedAt: released,
      requestedAt: new Date('2026-08-10T00:00:00Z'),
      scenarioCount: 21,
    });
    expect(result).toMatchObject({
      allowed: false,
      code: 'RETEST_SCENARIO_LIMIT_EXCEEDED',
    });
  });

  it('rejects a retest on a package that includes none', () => {
    const result = checkRetestEligibility(essential, emptyUsage(), {
      reportReleasedAt: released,
      requestedAt: new Date('2026-08-02T00:00:00Z'),
      scenarioCount: 1,
    });
    expect(result.allowed).toBe(false);
  });

  it('rejects a second retest once the included one is used', () => {
    const result = checkRetestEligibility(
      bilingualPro,
      usageWith({ retests: 1 }),
      {
        reportReleasedAt: released,
        requestedAt: new Date('2026-08-10T00:00:00Z'),
        scenarioCount: 5,
      },
    );
    expect(result).toMatchObject({
      allowed: false,
      code: 'ENTITLEMENT_EXHAUSTED',
    });
  });
});

describe('checkMonitoringEntitlement', () => {
  it('blocks scheduled monitoring on one-time audit packages', () => {
    expect(checkMonitoringEntitlement(essential)).toMatchObject({
      allowed: false,
      code: 'MONITORING_NOT_ENTITLED',
    });
    expect(checkMonitoringEntitlement(bilingualPro).allowed).toBe(false);
  });

  it('allows monitoring on a subscription', () => {
    expect(checkMonitoringEntitlement(continuous).allowed).toBe(true);
  });
});

describe('seat and system limits', () => {
  it('blocks adding a system beyond the plan', () => {
    const single: Entitlement = { ...essential, systems: 1 };
    expect(
      checkUsage(single, usageWith({ systems: 1 }), 'systems').allowed,
    ).toBe(false);
  });

  it('blocks inviting a seat beyond the plan', () => {
    expect(
      checkUsage(essential, usageWith({ seats: essential.userSeats }), 'seats')
        .allowed,
    ).toBe(false);
  });
});
