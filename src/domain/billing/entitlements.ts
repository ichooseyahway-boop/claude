/**
 * Entitlement engine (PRD FR-BILL-004, 6.1-6.4, 6.6).
 *
 * Every quota decision runs through here, on the server, before a run is
 * created or an allowance consumed. PRD 6.3 is explicit that there is no
 * silent unlimited usage: an over-limit request is either refused or recorded
 * as a billable overage, never quietly allowed.
 *
 * Prices are NOT in this module. PRD 6 requires amounts to live in
 * configuration and in the payment provider's price records, so that changing
 * a price never means changing business logic.
 */

import { z } from 'zod';

export const SUPPORTED_LOCALES = ['en-CA', 'fr-CA'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const PACKAGE_CODES = [
  'essential_audit',
  'bilingual_pro_audit',
  'continuous_assurance',
  'enterprise_managed',
] as const;
export type PackageCode = (typeof PACKAGE_CODES)[number];

/**
 * Entitlement shape stored as JSON on `service_packages` and snapshotted onto
 * an order or subscription. Validated with this schema on read, because a
 * hand-edited entitlement blob must never be able to grant unbounded usage.
 */
export const entitlementSchema = z.object({
  /** Number of distinct AI systems the plan covers. */
  systemCount: z.number().int().min(1).max(100),
  locales: z.array(z.enum(SUPPORTED_LOCALES)).min(1),
  /** Maximum approved scenarios per cycle (or per audit for one-time plans). */
  scenarioLimit: z.number().int().min(1).max(1000),
  /** Reports included per cycle. */
  reportAllowance: z.number().int().min(1).max(100),
  /** Retest runs included. PRD 6.1 Essential includes none. */
  retestAllowance: z.number().int().min(0).max(100),
  /** Cases a single retest may cover. PRD 6.2 caps Bilingual Pro at 20. */
  retestCaseLimit: z.number().int().min(0).max(1000),
  monitoringFrequency: z.enum(['none', 'monthly', 'quarterly']),
  userSeatAllowance: z.number().int().min(1).max(500),
  evidenceRetentionDays: z.number().int().min(1).max(3650),
  supportLevel: z.enum(['standard', 'priority', 'enterprise']),
  /** PRD 6.3: usage beyond the cap is billed, not silently permitted. */
  overagesEnabled: z.boolean(),
  /** Hard ceiling even when overages are enabled. */
  hardScenarioCeiling: z.number().int().min(1).max(5000),
});

export type Entitlement = z.infer<typeof entitlementSchema>;

/**
 * Reference entitlements for the launch packages (PRD 6.1-6.4).
 *
 * These are defaults used to seed `service_packages`. The database row is the
 * source of truth at runtime so the owner can adjust limits without a deploy
 * (FR-OPS-004).
 */
export const REFERENCE_ENTITLEMENTS: Readonly<Record<PackageCode, Entitlement>> = Object.freeze({
  essential_audit: {
    systemCount: 1,
    locales: ['en-CA'],
    scenarioLimit: 25,
    reportAllowance: 1,
    retestAllowance: 0,
    retestCaseLimit: 0,
    monitoringFrequency: 'none',
    userSeatAllowance: 3,
    evidenceRetentionDays: 90,
    supportLevel: 'standard',
    overagesEnabled: false,
    hardScenarioCeiling: 25,
  },
  bilingual_pro_audit: {
    systemCount: 1,
    locales: ['en-CA', 'fr-CA'],
    scenarioLimit: 75,
    reportAllowance: 1,
    retestAllowance: 1,
    retestCaseLimit: 20,
    monitoringFrequency: 'none',
    userSeatAllowance: 10,
    evidenceRetentionDays: 90,
    supportLevel: 'priority',
    overagesEnabled: false,
    hardScenarioCeiling: 75,
  },
  continuous_assurance: {
    systemCount: 1,
    locales: ['en-CA', 'fr-CA'],
    scenarioLimit: 100,
    reportAllowance: 12,
    retestAllowance: 12,
    retestCaseLimit: 50,
    monitoringFrequency: 'monthly',
    userSeatAllowance: 25,
    evidenceRetentionDays: 365,
    supportLevel: 'priority',
    overagesEnabled: true,
    hardScenarioCeiling: 200,
  },
  enterprise_managed: {
    systemCount: 5,
    locales: ['en-CA', 'fr-CA'],
    scenarioLimit: 250,
    reportAllowance: 24,
    retestAllowance: 24,
    retestCaseLimit: 100,
    monitoringFrequency: 'monthly',
    userSeatAllowance: 100,
    evidenceRetentionDays: 730,
    supportLevel: 'enterprise',
    overagesEnabled: true,
    hardScenarioCeiling: 1000,
  },
});

// ---------------------------------------------------------------------------
// Usage checks
// ---------------------------------------------------------------------------

export type EntitlementMetric = 'scenarios' | 'reports' | 'retests' | 'systems' | 'user_seats';

export interface UsageSnapshot {
  readonly scenariosUsed: number;
  readonly reportsUsed: number;
  readonly retestsUsed: number;
  readonly systemsUsed: number;
  readonly userSeatsUsed: number;
}

export type EntitlementDecision =
  | { readonly outcome: 'allowed'; readonly remaining: number }
  | {
      readonly outcome: 'allowed_as_overage';
      readonly overageQuantity: number;
      readonly remainingToHardCeiling: number;
    }
  | {
      readonly outcome: 'denied';
      readonly code: EntitlementDenialCode;
      readonly message: string;
      readonly limit: number;
      readonly used: number;
    };

export type EntitlementDenialCode =
  | 'SCENARIO_LIMIT_REACHED'
  | 'SCENARIO_HARD_CEILING_REACHED'
  | 'REPORT_ALLOWANCE_EXHAUSTED'
  | 'RETEST_ALLOWANCE_EXHAUSTED'
  | 'SYSTEM_LIMIT_REACHED'
  | 'SEAT_LIMIT_REACHED'
  | 'LOCALE_NOT_ENTITLED'
  | 'INVALID_QUANTITY';

function limitFor(entitlement: Entitlement, metric: EntitlementMetric): number {
  switch (metric) {
    case 'scenarios':
      return entitlement.scenarioLimit;
    case 'reports':
      return entitlement.reportAllowance;
    case 'retests':
      return entitlement.retestAllowance;
    case 'systems':
      return entitlement.systemCount;
    case 'user_seats':
      return entitlement.userSeatAllowance;
  }
}

function usedFor(usage: UsageSnapshot, metric: EntitlementMetric): number {
  switch (metric) {
    case 'scenarios':
      return usage.scenariosUsed;
    case 'reports':
      return usage.reportsUsed;
    case 'retests':
      return usage.retestsUsed;
    case 'systems':
      return usage.systemsUsed;
    case 'user_seats':
      return usage.userSeatsUsed;
  }
}

const DENIAL_CODES: Readonly<Record<EntitlementMetric, EntitlementDenialCode>> = Object.freeze({
  scenarios: 'SCENARIO_LIMIT_REACHED',
  reports: 'REPORT_ALLOWANCE_EXHAUSTED',
  retests: 'RETEST_ALLOWANCE_EXHAUSTED',
  systems: 'SYSTEM_LIMIT_REACHED',
  user_seats: 'SEAT_LIMIT_REACHED',
});

/**
 * Decides whether `quantity` more of `metric` may be consumed.
 *
 * Overages apply to scenarios only, and only when the plan enables them and
 * the hard ceiling still has room (PRD 6.3, 6.6).
 */
export function checkEntitlement(
  entitlement: Entitlement,
  usage: UsageSnapshot,
  metric: EntitlementMetric,
  quantity = 1,
): EntitlementDecision {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      outcome: 'denied',
      code: 'INVALID_QUANTITY',
      message: 'Requested quantity must be a positive integer.',
      limit: 0,
      used: 0,
    };
  }

  const limit = limitFor(entitlement, metric);
  const used = usedFor(usage, metric);
  const projected = used + quantity;

  if (projected <= limit) {
    return { outcome: 'allowed', remaining: limit - projected };
  }

  if (metric === 'scenarios' && entitlement.overagesEnabled) {
    if (projected > entitlement.hardScenarioCeiling) {
      return {
        outcome: 'denied',
        code: 'SCENARIO_HARD_CEILING_REACHED',
        message: `This would use ${projected} scenarios, above the hard ceiling of ${entitlement.hardScenarioCeiling}. Increase the plan or reduce scope.`,
        limit: entitlement.hardScenarioCeiling,
        used,
      };
    }

    // Only the portion above the included limit is billable.
    const overageQuantity = projected - Math.max(used, limit);

    return {
      outcome: 'allowed_as_overage',
      overageQuantity,
      remainingToHardCeiling: entitlement.hardScenarioCeiling - projected,
    };
  }

  return {
    outcome: 'denied',
    code: DENIAL_CODES[metric],
    message: `This would use ${projected} of ${limit} included ${metric.replace('_', ' ')}.`,
    limit,
    used,
  };
}

/** PRD 6.1: an English-only plan cannot order a French audit. */
export function checkLocaleEntitlement(
  entitlement: Entitlement,
  requested: readonly SupportedLocale[],
): EntitlementDecision {
  const missing = requested.filter((locale) => !entitlement.locales.includes(locale));

  if (missing.length > 0) {
    return {
      outcome: 'denied',
      code: 'LOCALE_NOT_ENTITLED',
      message: `This package does not include ${missing.join(', ')}. Upgrade to a bilingual package.`,
      limit: entitlement.locales.length,
      used: requested.length,
    };
  }

  return { outcome: 'allowed', remaining: 0 };
}

/** Parses and validates a stored entitlement blob. Throws on invalid input. */
export function parseEntitlement(value: unknown): Entitlement {
  return entitlementSchema.parse(value);
}
