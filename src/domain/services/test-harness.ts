import { createMemoryDataStore, type MemoryState } from '@/data/memory/store';
import { getProviders } from '@/integrations/registry';
import type {
  AuditPlan,
  Membership,
  MembershipRole,
  Organization,
  PlanScenario,
  Profile,
  Project,
  ScenarioTemplate,
  TestRun,
} from '@/data/types';
import type { Actor } from '@/domain/access/actor';
import { getPackage } from '@/config/packages';
import type { ServiceContext } from './context';

/**
 * Test harness for the service layer.
 *
 * Builds a ServiceContext backed by the in-memory store, with a fixed clock and
 * sequential IDs so assertions are deterministic. Exported from `src/` rather
 * than a test directory because the local development seed also uses it.
 */

export const FIXED_NOW = new Date('2026-08-09T12:00:00Z');
export const ORG_ID = 'org_1';
export const OTHER_ORG_ID = 'org_2';
export const PROJECT_ID = 'proj_1';

export interface Harness {
  context: ServiceContext;
  state: MemoryState;
  /** Swap the acting user without rebuilding the store. */
  as(actor: Actor | null): ServiceContext;
  advance(ms: number): void;
}

let idCounter = 0;

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user_1',
    displayName: 'Test User',
    email: 'user@example.ca',
    locale: 'en-CA',
    timezone: 'America/Toronto',
    mfaEnrolledAt: new Date('2026-01-01T00:00:00Z'),
    status: 'active',
    ...overrides,
  };
}

export function makeActor(
  role: MembershipRole,
  overrides: {
    userId?: string;
    organizationId?: string;
    profile?: Partial<Profile>;
    projectScope?: string[] | null;
    authenticatedAt?: Date;
  } = {},
): Actor {
  const userId = overrides.userId ?? `user_${role}`;
  const membership: Membership = {
    id: `mem_${userId}`,
    organizationId: overrides.organizationId ?? ORG_ID,
    userId,
    role,
    projectScope: overrides.projectScope ?? null,
    acceptedAt: new Date('2026-01-01T00:00:00Z'),
    revokedAt: null,
  };
  return {
    userId,
    profile: makeProfile({ id: userId, ...overrides.profile }),
    memberships: [membership],
    authenticatedAt: overrides.authenticatedAt ?? FIXED_NOW,
  };
}

export function createHarness(actor: Actor | null = null): Harness {
  idCounter = 0;
  const store = createMemoryDataStore();
  let now = FIXED_NOW;

  const base: ServiceContext = {
    actor,
    data: store,
    providers: getProviders(),
    now: () => now,
    newId: () => `id_${++idCounter}`,
    correlationId: 'corr_test',
  };

  return {
    context: base,
    state: store.state,
    as(nextActor) {
      return { ...base, actor: nextActor };
    },
    advance(ms) {
      now = new Date(now.getTime() + ms);
    },
  };
}

/** Seed an organization, a project and (optionally) an accepted scope. */
export async function seedProject(
  harness: Harness,
  options: {
    organizationId?: string;
    projectId?: string;
    packageCode?: Parameters<typeof getPackage>[0];
    status?: Project['status'];
    locales?: Project['locales'];
    onboardingAccepted?: boolean;
  } = {},
): Promise<{ organization: Organization; project: Project }> {
  const organizationId = options.organizationId ?? ORG_ID;
  const projectId = options.projectId ?? PROJECT_ID;
  const servicePackage = getPackage(options.packageCode ?? 'bilingual_pro_audit');

  const organization: Organization = {
    id: organizationId,
    name: 'Test Organization',
    slug: `test-org-${organizationId}`,
    legalName: 'Test Organization Inc.',
    billingEmail: 'billing@example.ca',
    privacyContactEmail: 'privacy@example.ca',
    defaultLocale: 'en-CA',
    status: 'active',
    createdAt: FIXED_NOW,
  };
  await harness.context.data.organizations.create(organization);

  const project: Project = {
    id: projectId,
    organizationId,
    orderId: 'order_1',
    subscriptionId: null,
    name: 'Test Project',
    packageCode: servicePackage.code,
    entitlement: servicePackage.entitlement,
    locales: options.locales ?? ['en-CA', 'fr-CA'],
    status: options.status ?? 'onboarding',
    dueDate: null,
    assignedAnalystId: null,
    scopeSummary: null,
    blockedReason: null,
    onboardingCompletedAt: null,
    onboardingAcceptedAt: options.onboardingAccepted ? FIXED_NOW : null,
    createdAt: FIXED_NOW,
  };
  await harness.context.data.projects.create(project);

  return { organization, project };
}

export function makeScenarioTemplate(
  overrides: Partial<ScenarioTemplate> = {},
): ScenarioTemplate {
  return {
    id: overrides.id ?? `scenario_${++idCounter}`,
    familyId: overrides.familyId ?? 'family_1',
    version: overrides.version ?? 1,
    locale: overrides.locale ?? 'en-CA',
    title: overrides.title ?? 'Refund window',
    objective: overrides.objective ?? 'Confirm the stated refund window.',
    category: overrides.category ?? 'policy_accuracy',
    riskWeight: overrides.riskWeight ?? 1,
    body: overrides.body ?? {
      turns: [{ role: 'tester', content: 'How long do I have to get a refund?' }],
    },
    evaluationRules: overrides.evaluationRules ?? {},
    tags: overrides.tags ?? [],
    status: overrides.status ?? 'published',
    bilingualPairKey: overrides.bilingualPairKey ?? null,
  };
}

/** Seed an approved plan with `count` scenarios in each supplied locale. */
export async function seedApprovedPlan(
  harness: Harness,
  options: {
    organizationId?: string;
    projectId?: string;
    count?: number;
    locales?: Array<'en-CA' | 'fr-CA'>;
    paired?: boolean;
  } = {},
): Promise<{ plan: AuditPlan; scenarios: PlanScenario[] }> {
  const organizationId = options.organizationId ?? ORG_ID;
  const projectId = options.projectId ?? PROJECT_ID;
  const count = options.count ?? 2;
  const locales = options.locales ?? ['en-CA'];

  const plan: AuditPlan = {
    id: `plan_${projectId}`,
    organizationId,
    projectId,
    version: 1,
    status: 'approved',
    scenarioLimit: 75,
    changeReason: null,
    createdBy: 'user_analyst',
    approvedBy: 'user_senior_analyst',
    approvedAt: FIXED_NOW,
    createdAt: FIXED_NOW,
  };
  await harness.context.data.auditPlans.create(plan);

  const scenarios: PlanScenario[] = [];
  let sequence = 0;
  for (let i = 0; i < count; i += 1) {
    const pairId = options.paired ? `pair_${i}` : null;
    for (const locale of locales) {
      const template = makeScenarioTemplate({ locale });
      await harness.context.data.scenarios.create(template);
      sequence += 1;
      const scenario: PlanScenario = {
        id: `planscenario_${sequence}`,
        organizationId,
        auditPlanId: plan.id,
        scenarioTemplateId: template.id,
        customScenario: null,
        locale,
        sequence,
        riskWeight: 1,
        bilingualPairId: pairId,
        customerFacts: {},
        expectedOutcomes: ['Thirty days from delivery.'],
      };
      scenarios.push(await harness.context.data.auditPlans.addScenario(scenario));
    }
  }

  return { plan, scenarios };
}

export async function seedRun(
  harness: Harness,
  options: {
    organizationId?: string;
    projectId?: string;
    planId?: string;
    state?: TestRun['state'];
  } = {},
): Promise<TestRun> {
  const organizationId = options.organizationId ?? ORG_ID;
  const projectId = options.projectId ?? PROJECT_ID;
  const run: TestRun = {
    id: `run_${projectId}`,
    organizationId,
    projectId,
    auditPlanId: options.planId ?? `plan_${projectId}`,
    runType: 'initial',
    state: options.state ?? 'draft',
    baselineRunId: null,
    startedAt: null,
    completedAt: null,
    releasedAt: null,
    rubricVersion: 'default@1.0.0',
    evaluatorVersion: null,
    aiCostMinor: 0,
    analystMinutes: 0,
    createdAt: FIXED_NOW,
  };
  return harness.context.data.runs.create(run);
}

/** Seed an active authorization attestation for a project. */
export async function seedAuthorization(
  harness: Harness,
  options: { organizationId?: string; projectId?: string } = {},
): Promise<void> {
  const organizationId = options.organizationId ?? ORG_ID;
  const projectId = options.projectId ?? PROJECT_ID;
  await harness.context.data.authorizations.create({
    id: `attestation_${projectId}`,
    organizationId,
    projectId,
    signerUserId: 'user_client_owner',
    documentVersion: 'authorization@1.0.0',
    scope: {
      systemId: 'system_1',
      authorizedHosts: ['api.example.ca'],
      locales: ['en-CA', 'fr-CA'],
      restrictedTopics: [],
      prohibitedData: [],
    },
    acceptedAt: FIXED_NOW,
    expiresAt: new Date(FIXED_NOW.getTime() + 90 * 86_400_000),
    revokedAt: null,
    revokedReason: null,
  });
}
