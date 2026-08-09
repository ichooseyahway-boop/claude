import type { AuditPlan, PlanScenario, ScenarioTemplate } from '@/data/types';
import type { Locale } from '@/lib/i18n';
import { checkUsage } from '@/domain/entitlements/entitlements';
import {
  audit,
  fail,
  ok,
  permit,
  type ServiceContext,
  type ServiceResult,
} from './context';

/**
 * Scenario library and audit plan builder.
 *
 * PRD refs: FR-SCN-001..004, section 8.3 steps 1–2.
 *
 * The central rule: an approved plan is FROZEN. Execution happens against a
 * specific plan version, and changing an approved plan creates a new version
 * with a recorded reason — historical audits keep the plan they actually ran.
 */

export interface PlanCoverage {
  totalScenarios: number;
  byLocale: Record<string, number>;
  byCategory: Record<string, number>;
  matchedPairs: number;
  unpairedLocaleScenarios: number;
  /** Categories from FR-SCN-002 with no scenario in the plan. */
  missingCategories: string[];
  scenarioLimit: number;
  remaining: number;
}

/** The categories every audit plan is measured against (FR-SCN-002). */
export const REQUIRED_CATEGORIES = [
  'knowledge_accuracy',
  'policy_accuracy',
  'resolution',
  'context_memory',
  'empathy_tone',
  'escalation',
  'privacy_sensitive',
  'prompt_injection',
  'fairness_bias',
  'language_quality',
  'robustness',
  'crisis_boundary',
] as const;

/**
 * Create a new draft plan for a project.
 *
 * A project may only have one draft at a time: two concurrent drafts make
 * "which plan gets approved" ambiguous, and the PRD's freeze semantics depend
 * on that being unambiguous.
 */
export async function createPlan(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
  changeReason?: string,
): Promise<ServiceResult<AuditPlan>> {
  const decision = permit(context, organizationId, 'plan.build', {
    projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const project = await context.data.projects.findById(
    organizationId,
    projectId,
  );
  if (!project) return fail('NOT_FOUND', 'No such project.');

  if (project.onboardingAcceptedAt === null) {
    return fail(
      'INVALID_STATE',
      'A plan cannot be built until scope has been accepted.',
    );
  }

  const existing = await context.data.auditPlans.listForProject(
    organizationId,
    projectId,
  );

  if (existing.some((p) => p.status === 'draft')) {
    return fail(
      'CONFLICT',
      'This project already has a draft plan. Edit or discard it first.',
    );
  }

  const approved = existing.filter((p) => p.status === 'approved');
  if (approved.length > 0 && (changeReason ?? '').trim() === '') {
    // FR-SCN-003: "changes require a new version and reason".
    return fail(
      'VALIDATION_FAILED',
      'Superseding an approved plan requires a recorded reason.',
    );
  }

  const nextVersion =
    existing.reduce((max, p) => Math.max(max, p.version), 0) + 1;

  const plan: AuditPlan = {
    id: context.newId(),
    organizationId,
    projectId,
    version: nextVersion,
    status: 'draft',
    scenarioLimit: project.entitlement.scenariosPerCycle,
    changeReason: changeReason?.trim() || null,
    createdBy: context.actor?.userId ?? null,
    approvedBy: null,
    approvedAt: null,
    createdAt: context.now(),
  };

  const saved = await context.data.auditPlans.create(plan);

  await audit(context, {
    organizationId,
    action: 'plan.created',
    objectType: 'audit_plan',
    objectId: saved.id,
    outcome: 'success',
    metadata: { version: saved.version },
  });

  return ok(saved);
}

export interface AddScenarioInput {
  scenarioTemplateId?: string;
  customScenario?: ScenarioTemplate['body'];
  locale: Locale;
  riskWeight?: 1 | 1.5 | 2;
  bilingualPairId?: string;
  customerFacts?: Record<string, string>;
  expectedOutcomes?: string[];
}

/**
 * Add a scenario to a draft plan.
 *
 * Enforces the entitlement scenario cap here rather than at execution: telling
 * an analyst at build time that the plan exceeds what the customer bought is
 * far better than discovering it mid-run.
 */
export async function addScenarioToPlan(
  context: ServiceContext,
  organizationId: string,
  planId: string,
  input: AddScenarioInput,
): Promise<ServiceResult<PlanScenario>> {
  const plan = await context.data.auditPlans.findById(organizationId, planId);
  if (!plan) return fail('NOT_FOUND', 'No such plan.');

  const decision = permit(context, organizationId, 'plan.build', {
    projectId: plan.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (plan.status !== 'draft') {
    return fail(
      'IMMUTABLE',
      'An approved plan is frozen. Create a new version to change it.',
    );
  }

  if (!input.scenarioTemplateId && !input.customScenario) {
    return fail(
      'VALIDATION_FAILED',
      'A scenario template or a custom scenario is required.',
    );
  }

  const project = await context.data.projects.findById(
    organizationId,
    plan.projectId,
  );
  if (!project) return fail('NOT_FOUND', 'No such project.');

  if (!project.locales.includes(input.locale)) {
    return fail(
      'VALIDATION_FAILED',
      `This project does not cover ${input.locale}.`,
    );
  }

  const existing = await context.data.auditPlans.listScenarios(
    organizationId,
    planId,
  );

  const usage = checkUsage(
    project.entitlement,
    {
      consumed: {
        scenarios: existing.length,
        reports: 0,
        retests: 0,
        systems: 0,
        seats: 0,
      },
    },
    'scenarios',
  );
  if (!usage.allowed) {
    return fail('ENTITLEMENT_EXHAUSTED', usage.message);
  }

  if (input.scenarioTemplateId) {
    const template = await context.data.scenarios.findById(
      input.scenarioTemplateId,
    );
    if (!template) return fail('NOT_FOUND', 'No such scenario template.');
    if (template.status !== 'published') {
      return fail(
        'VALIDATION_FAILED',
        'Only published scenario templates can be added to a plan.',
      );
    }
    if (template.locale !== input.locale) {
      return fail(
        'VALIDATION_FAILED',
        'The scenario template locale does not match the requested locale.',
      );
    }
  }

  const scenario: PlanScenario = {
    id: context.newId(),
    organizationId,
    auditPlanId: planId,
    scenarioTemplateId: input.scenarioTemplateId ?? null,
    customScenario: input.customScenario ?? null,
    locale: input.locale,
    sequence: existing.length + 1,
    riskWeight: input.riskWeight ?? 1,
    bilingualPairId: input.bilingualPairId ?? null,
    customerFacts: input.customerFacts ?? {},
    expectedOutcomes: input.expectedOutcomes ?? [],
  };

  return ok(await context.data.auditPlans.addScenario(scenario));
}

/**
 * Coverage and risk-gap summary shown while building (FR-SCN-003).
 */
export async function planCoverage(
  context: ServiceContext,
  organizationId: string,
  planId: string,
): Promise<ServiceResult<PlanCoverage>> {
  const plan = await context.data.auditPlans.findById(organizationId, planId);
  if (!plan) return fail('NOT_FOUND', 'No such plan.');

  const decision = permit(context, organizationId, 'plan.build', {
    projectId: plan.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const scenarios = await context.data.auditPlans.listScenarios(
    organizationId,
    planId,
  );

  const byLocale: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const pairCounts = new Map<string, number>();

  for (const scenario of scenarios) {
    byLocale[scenario.locale] = (byLocale[scenario.locale] ?? 0) + 1;

    const template = scenario.scenarioTemplateId
      ? await context.data.scenarios.findById(scenario.scenarioTemplateId)
      : null;
    const category = template?.category ?? 'custom';
    byCategory[category] = (byCategory[category] ?? 0) + 1;

    if (scenario.bilingualPairId) {
      pairCounts.set(
        scenario.bilingualPairId,
        (pairCounts.get(scenario.bilingualPairId) ?? 0) + 1,
      );
    }
  }

  // A "matched pair" needs both halves. A pair ID with one scenario is an
  // incomplete pair and must not be counted toward the parity threshold.
  let matchedPairs = 0;
  let unpaired = 0;
  for (const count of pairCounts.values()) {
    if (count >= 2) matchedPairs += 1;
    else unpaired += 1;
  }

  const missingCategories = REQUIRED_CATEGORIES.filter(
    (category) => (byCategory[category] ?? 0) === 0,
  );

  return ok({
    totalScenarios: scenarios.length,
    byLocale,
    byCategory,
    matchedPairs,
    unpairedLocaleScenarios: unpaired,
    missingCategories: [...missingCategories],
    scenarioLimit: plan.scenarioLimit,
    remaining: Math.max(0, plan.scenarioLimit - scenarios.length),
  });
}

/**
 * Approve and freeze a plan (FR-SCN-003).
 *
 * Approval is a senior action. Once approved the plan becomes immutable and any
 * previously approved plan for the project is superseded.
 */
export async function approvePlan(
  context: ServiceContext,
  organizationId: string,
  planId: string,
): Promise<ServiceResult<AuditPlan>> {
  const plan = await context.data.auditPlans.findById(organizationId, planId);
  if (!plan) return fail('NOT_FOUND', 'No such plan.');

  const decision = permit(context, organizationId, 'plan.approve', {
    projectId: plan.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (plan.status !== 'draft') {
    return fail('INVALID_STATE', 'Only a draft plan can be approved.');
  }

  const scenarios = await context.data.auditPlans.listScenarios(
    organizationId,
    planId,
  );
  if (scenarios.length === 0) {
    return fail('VALIDATION_FAILED', 'A plan needs at least one scenario.');
  }

  // Supersede any previously approved plan so exactly one is current.
  const others = await context.data.auditPlans.listForProject(
    organizationId,
    plan.projectId,
  );
  for (const other of others) {
    if (other.id !== planId && other.status === 'approved') {
      await context.data.auditPlans.update(organizationId, other.id, {
        status: 'superseded',
      });
    }
  }

  const approved = await context.data.auditPlans.update(
    organizationId,
    planId,
    {
      status: 'approved',
      approvedBy: context.actor?.userId ?? null,
      approvedAt: context.now(),
    },
  );

  await audit(context, {
    organizationId,
    action: 'plan.approved',
    objectType: 'audit_plan',
    objectId: planId,
    outcome: 'success',
    metadata: { version: approved.version, scenarios: scenarios.length },
  });

  return ok(approved);
}

/**
 * Pair matching English and French scenarios in a plan.
 *
 * Returns the pair ID so both halves can be added with it. Parity requires the
 * pair to be established at plan time, not inferred afterwards from titles.
 */
export function newBilingualPairId(context: ServiceContext): string {
  return context.newId();
}
