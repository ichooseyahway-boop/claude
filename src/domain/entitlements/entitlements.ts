import { z } from 'zod';

/**
 * Entitlement engine.
 *
 * PRD ref: FR-BILL-004.
 *
 * Entitlements are the single server-side answer to "is this customer allowed
 * to do this?". Every consuming action must call `checkUsage` BEFORE the work
 * is performed — the PRD is explicit that "Usage must be checked at the server
 * before creating a run or consuming an entitlement."
 *
 * Values are stored as JSON on `service_packages` and validated against this
 * schema, so a mistyped package record fails loudly at load time instead of
 * granting an accidental unlimited plan.
 */

export const LocaleScopeSchema = z.enum(['single', 'bilingual']);
export type LocaleScope = z.infer<typeof LocaleScopeSchema>;

export const SupportLevelSchema = z.enum([
  'standard',
  'priority',
  'enterprise',
]);
export type SupportLevel = z.infer<typeof SupportLevelSchema>;

export const MonitoringFrequencySchema = z.enum(['none', 'monthly', 'custom']);
export type MonitoringFrequency = z.infer<typeof MonitoringFrequencySchema>;

export const EntitlementSchema = z.object({
  /** Number of AI systems covered. */
  systems: z.number().int().positive(),
  localeScope: LocaleScopeSchema,
  /** Maximum scenarios per cycle (or per audit for one-time packages). */
  scenariosPerCycle: z.number().int().positive(),
  /** Reports included per cycle. */
  reportsPerCycle: z.number().int().nonnegative(),
  /** Retest runs included per cycle. */
  retestsPerCycle: z.number().int().nonnegative(),
  /** Maximum scenarios that may be re-run in a single retest. */
  retestScenarioLimit: z.number().int().nonnegative(),
  /** Days after report release during which a retest may be requested. */
  retestWindowDays: z.number().int().nonnegative(),
  monitoringFrequency: MonitoringFrequencySchema,
  userSeats: z.number().int().positive(),
  evidenceRetentionDays: z.number().int().positive(),
  supportLevel: SupportLevelSchema,
  /** Maximum prioritized findings presented in the report. */
  maxPrioritizedFindings: z.number().int().positive(),
  /** Whether overage beyond the cycle cap may be billed rather than blocked. */
  overagesAllowed: z.boolean(),
});

export type Entitlement = z.infer<typeof EntitlementSchema>;

/** Metrics tracked in `usage_counters` and checked before consumption. */
export const USAGE_METRICS = [
  'scenarios',
  'reports',
  'retests',
  'systems',
  'seats',
] as const;

export type UsageMetric = (typeof USAGE_METRICS)[number];

export interface UsageSnapshot {
  /** Consumed so far in the current billing/assessment cycle. */
  consumed: Record<UsageMetric, number>;
}

export type UsageDenialCode =
  | 'ENTITLEMENT_EXHAUSTED'
  | 'LOCALE_NOT_ENTITLED'
  | 'MONITORING_NOT_ENTITLED'
  | 'RETEST_WINDOW_EXPIRED'
  | 'RETEST_SCENARIO_LIMIT_EXCEEDED';

export type UsageCheck =
  | { allowed: true; remaining: number; wouldIncurOverage: boolean }
  | {
      allowed: false;
      code: UsageDenialCode;
      message: string;
      remaining: number;
    };

function limitFor(entitlement: Entitlement, metric: UsageMetric): number {
  switch (metric) {
    case 'scenarios':
      return entitlement.scenariosPerCycle;
    case 'reports':
      return entitlement.reportsPerCycle;
    case 'retests':
      return entitlement.retestsPerCycle;
    case 'systems':
      return entitlement.systems;
    case 'seats':
      return entitlement.userSeats;
  }
}

/**
 * Check whether `quantity` more units of `metric` may be consumed.
 *
 * Overage is only ever *reported*, never silently applied: when a plan allows
 * paid overage the caller still has to decide to bill it. Section 6.3 forbids
 * "silent unlimited usage".
 */
export function checkUsage(
  entitlement: Entitlement,
  usage: UsageSnapshot,
  metric: UsageMetric,
  quantity = 1,
): UsageCheck {
  const limit = limitFor(entitlement, metric);
  const consumed = usage.consumed[metric] ?? 0;
  const remaining = Math.max(0, limit - consumed);

  if (consumed + quantity <= limit) {
    return {
      allowed: true,
      remaining: limit - consumed - quantity,
      wouldIncurOverage: false,
    };
  }

  if (entitlement.overagesAllowed) {
    return { allowed: true, remaining: 0, wouldIncurOverage: true };
  }

  return {
    allowed: false,
    code: 'ENTITLEMENT_EXHAUSTED',
    message: `This plan includes ${limit} ${metric} per cycle and ${consumed} have been used.`,
    remaining,
  };
}

/**
 * Whether a specific set of requested locales fits the plan.
 *
 * A single-language plan may test EITHER language — the customer picks during
 * onboarding — but it may not test both, which is what separates Essential
 * from Bilingual Pro.
 */
export function checkLocaleScope(
  entitlement: Entitlement,
  requestedLocales: readonly string[],
): UsageCheck {
  const unique = Array.from(new Set(requestedLocales));
  const allowedCount = entitlement.localeScope === 'bilingual' ? 2 : 1;

  if (unique.length <= allowedCount) {
    return {
      allowed: true,
      remaining: allowedCount - unique.length,
      wouldIncurOverage: false,
    };
  }

  return {
    allowed: false,
    code: 'LOCALE_NOT_ENTITLED',
    message:
      'This package covers a single language. Bilingual testing requires the bilingual package.',
    remaining: 0,
  };
}

export interface RetestRequest {
  reportReleasedAt: Date;
  requestedAt: Date;
  scenarioCount: number;
}

export function checkRetestEligibility(
  entitlement: Entitlement,
  usage: UsageSnapshot,
  request: RetestRequest,
): UsageCheck {
  const elapsedDays =
    (request.requestedAt.getTime() - request.reportReleasedAt.getTime()) /
    86_400_000;

  if (elapsedDays > entitlement.retestWindowDays) {
    return {
      allowed: false,
      code: 'RETEST_WINDOW_EXPIRED',
      message: `Retests are available for ${entitlement.retestWindowDays} days after report release.`,
      remaining: 0,
    };
  }

  if (request.scenarioCount > entitlement.retestScenarioLimit) {
    return {
      allowed: false,
      code: 'RETEST_SCENARIO_LIMIT_EXCEEDED',
      message: `A retest covers up to ${entitlement.retestScenarioLimit} scenarios.`,
      remaining: entitlement.retestScenarioLimit,
    };
  }

  return checkUsage(entitlement, usage, 'retests', 1);
}

export function checkMonitoringEntitlement(
  entitlement: Entitlement,
): UsageCheck {
  if (entitlement.monitoringFrequency === 'none') {
    return {
      allowed: false,
      code: 'MONITORING_NOT_ENTITLED',
      message:
        'Scheduled monitoring requires a Continuous Assurance or Enterprise subscription.',
      remaining: 0,
    };
  }
  return { allowed: true, remaining: 0, wouldIncurOverage: false };
}

export function emptyUsage(): UsageSnapshot {
  return {
    consumed: {
      scenarios: 0,
      reports: 0,
      retests: 0,
      systems: 0,
      seats: 0,
    },
  };
}
