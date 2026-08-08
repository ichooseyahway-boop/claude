import {
  EntitlementSchema,
  type Entitlement,
} from '@/domain/entitlements/entitlements';

/**
 * Service package catalogue.
 *
 * PRD refs: section 6 (commercial model), FR-BILL-004.
 *
 * Section 6 is explicit: "All pricing must be stored in configuration and
 * payment-provider price records. Do not hard-code prices into business logic."
 *
 * The amounts below are the PRD's REFERENCE prices, used for display and for
 * seeding a development database. The authoritative amount charged is always
 * the billing provider's price record identified by `providerPriceIdEnvVar`;
 * checkout never sends an amount from this file.
 */

export type PackageCode =
  | 'essential_audit'
  | 'bilingual_pro_audit'
  | 'continuous_assurance'
  | 'enterprise_managed';

export type BillingType = 'one_time' | 'recurring' | 'quote';

export interface ServicePackage {
  code: PackageCode;
  billingType: BillingType;
  /** Reference amount in CAD minor units (cents), for display only. */
  referenceAmountMinor: number;
  currency: 'CAD';
  /** Environment variable holding the provider price ID for this package. */
  providerPriceIdEnvVar: string | null;
  /** Self-serve checkout availability. Enterprise is sales-assisted (6.4). */
  selfServeCheckout: boolean;
  displayOrder: number;
  /** Key into the `packages` section of the message catalogs. */
  messageKey: 'essential' | 'bilingualPro' | 'continuous' | 'enterprise';
  entitlement: Entitlement;
  /** Business-day target from accepted onboarding to release (6.1, 6.2). */
  targetTurnaroundBusinessDays: number | null;
}

const PACKAGES: ServicePackage[] = [
  {
    code: 'essential_audit',
    billingType: 'one_time',
    referenceAmountMinor: 49_500, // CA$495.00
    currency: 'CAD',
    providerPriceIdEnvVar: 'BILLING_PRICE_ID_ESSENTIAL_AUDIT',
    selfServeCheckout: true,
    displayOrder: 1,
    messageKey: 'essential',
    targetTurnaroundBusinessDays: 5,
    entitlement: {
      systems: 1,
      localeScope: 'single',
      scenariosPerCycle: 25,
      reportsPerCycle: 1,
      retestsPerCycle: 0,
      retestScenarioLimit: 0,
      retestWindowDays: 0,
      monitoringFrequency: 'none',
      userSeats: 3,
      evidenceRetentionDays: 90,
      supportLevel: 'standard',
      maxPrioritizedFindings: 5,
      overagesAllowed: false,
    },
  },
  {
    code: 'bilingual_pro_audit',
    billingType: 'one_time',
    referenceAmountMinor: 175_000, // CA$1,750.00
    currency: 'CAD',
    providerPriceIdEnvVar: 'BILLING_PRICE_ID_BILINGUAL_PRO_AUDIT',
    selfServeCheckout: true,
    displayOrder: 2,
    messageKey: 'bilingualPro',
    targetTurnaroundBusinessDays: 5,
    entitlement: {
      systems: 1,
      localeScope: 'bilingual',
      scenariosPerCycle: 75,
      reportsPerCycle: 1,
      retestsPerCycle: 1,
      retestScenarioLimit: 20,
      retestWindowDays: 30,
      monitoringFrequency: 'none',
      userSeats: 5,
      evidenceRetentionDays: 90,
      supportLevel: 'standard',
      maxPrioritizedFindings: 15,
      overagesAllowed: false,
    },
  },
  {
    code: 'continuous_assurance',
    billingType: 'recurring',
    referenceAmountMinor: 69_900, // CA$699.00 / month
    currency: 'CAD',
    providerPriceIdEnvVar: 'BILLING_PRICE_ID_CONTINUOUS_ASSURANCE',
    selfServeCheckout: true,
    displayOrder: 3,
    messageKey: 'continuous',
    targetTurnaroundBusinessDays: 5,
    entitlement: {
      systems: 1,
      localeScope: 'bilingual',
      scenariosPerCycle: 100,
      reportsPerCycle: 1,
      retestsPerCycle: 1,
      retestScenarioLimit: 20,
      retestWindowDays: 30,
      monitoringFrequency: 'monthly',
      userSeats: 10,
      evidenceRetentionDays: 180,
      supportLevel: 'priority',
      maxPrioritizedFindings: 15,
      // Section 6.3: "Configurable usage cap and paid overages; no silent
      // unlimited usage." Overage is billable but never automatic.
      overagesAllowed: true,
    },
  },
  {
    code: 'enterprise_managed',
    billingType: 'quote',
    referenceAmountMinor: 250_000, // CA$2,500.00 / month starting target
    currency: 'CAD',
    providerPriceIdEnvVar: null,
    selfServeCheckout: false,
    displayOrder: 4,
    messageKey: 'enterprise',
    targetTurnaroundBusinessDays: null,
    entitlement: {
      systems: 3,
      localeScope: 'bilingual',
      scenariosPerCycle: 200,
      reportsPerCycle: 2,
      retestsPerCycle: 2,
      retestScenarioLimit: 50,
      retestWindowDays: 60,
      monitoringFrequency: 'custom',
      userSeats: 25,
      evidenceRetentionDays: 365,
      supportLevel: 'enterprise',
      maxPrioritizedFindings: 30,
      overagesAllowed: true,
    },
  },
];

// Fail fast at module load if a package record is malformed.
for (const servicePackage of PACKAGES) {
  EntitlementSchema.parse(servicePackage.entitlement);
}

export const servicePackages: readonly ServicePackage[] = PACKAGES.slice().sort(
  (a, b) => a.displayOrder - b.displayOrder,
);

export function getPackage(code: PackageCode): ServicePackage {
  const found = servicePackages.find((p) => p.code === code);
  if (!found) {
    throw new Error(`Unknown service package: ${code}`);
  }
  return found;
}

export function isPackageCode(value: unknown): value is PackageCode {
  return (
    typeof value === 'string' &&
    servicePackages.some((p) => p.code === value)
  );
}

/**
 * Resolve the billing provider price ID for a package.
 *
 * Returns null when the environment has no price configured. Callers must
 * surface that as a configuration error rather than falling back to an amount
 * from this file — PRD 1.1.12 forbids hard-coded production values.
 */
export function providerPriceId(servicePackage: ServicePackage): string | null {
  if (!servicePackage.providerPriceIdEnvVar) return null;
  const value = process.env[servicePackage.providerPriceIdEnvVar];
  return value && value.trim().length > 0 ? value.trim() : null;
}
