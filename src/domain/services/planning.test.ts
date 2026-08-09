import { beforeEach, describe, expect, it } from 'vitest';
import {
  REQUIRED_CATEGORIES,
  addScenarioToPlan,
  approvePlan,
  createPlan,
  planCoverage,
} from './planning';
import {
  ORG_ID,
  PROJECT_ID,
  createHarness,
  makeActor,
  makeScenarioTemplate,
  seedProject,
  type Harness,
} from './test-harness';

let harness: Harness;
const analyst = makeActor('analyst');
const senior = makeActor('senior_analyst');
const clientOwner = makeActor('client_owner');

async function seedTemplate(
  h: Harness,
  overrides: Parameters<typeof makeScenarioTemplate>[0] = {},
) {
  const template = makeScenarioTemplate(overrides);
  await h.context.data.scenarios.create(template);
  return template;
}

beforeEach(async () => {
  harness = createHarness();
  await seedProject(harness, { onboardingAccepted: true, status: 'planning' });
});

describe('createPlan', () => {
  it('creates version 1 for an accepted project', async () => {
    const result = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBe(1);
    expect(result.value.status).toBe('draft');
    expect(result.value.scenarioLimit).toBe(75);
  });

  it('refuses before scope has been accepted', async () => {
    harness = createHarness();
    await seedProject(harness, { onboardingAccepted: false });
    const result = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_STATE' });
  });

  it('refuses a second concurrent draft', async () => {
    await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    const result = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    expect(result).toMatchObject({ ok: false, code: 'CONFLICT' });
  });

  it('requires a reason to supersede an approved plan', async () => {
    // FR-SCN-003: "changes require a new version and reason".
    const first = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const template = await seedTemplate(harness);
    await addScenarioToPlan(harness.as(analyst), ORG_ID, first.value.id, {
      scenarioTemplateId: template.id,
      locale: 'en-CA',
    });
    await approvePlan(harness.as(senior), ORG_ID, first.value.id);

    const withoutReason = await createPlan(
      harness.as(analyst),
      ORG_ID,
      PROJECT_ID,
    );
    expect(withoutReason).toMatchObject({
      ok: false,
      code: 'VALIDATION_FAILED',
    });

    const withReason = await createPlan(
      harness.as(analyst),
      ORG_ID,
      PROJECT_ID,
      'Customer added a French escalation policy.',
    );
    expect(withReason.ok).toBe(true);
    if (!withReason.ok) return;
    expect(withReason.value.version).toBe(2);
  });

  it('denies a client', async () => {
    const result = await createPlan(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
    );
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });
});

describe('addScenarioToPlan', () => {
  let planId: string;

  beforeEach(async () => {
    const plan = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (plan.ok) planId = plan.value.id;
  });

  it('adds a published template and assigns a sequence', async () => {
    const template = await seedTemplate(harness);
    const result = await addScenarioToPlan(
      harness.as(analyst),
      ORG_ID,
      planId,
      {
        scenarioTemplateId: template.id,
        locale: 'en-CA',
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sequence).toBe(1);
  });

  it('refuses an unpublished template', async () => {
    const template = await seedTemplate(harness, { status: 'draft' });
    const result = await addScenarioToPlan(
      harness.as(analyst),
      ORG_ID,
      planId,
      {
        scenarioTemplateId: template.id,
        locale: 'en-CA',
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('refuses a template whose locale does not match', async () => {
    const template = await seedTemplate(harness, { locale: 'fr-CA' });
    const result = await addScenarioToPlan(
      harness.as(analyst),
      ORG_ID,
      planId,
      {
        scenarioTemplateId: template.id,
        locale: 'en-CA',
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('refuses a locale the project does not cover', async () => {
    harness = createHarness();
    await seedProject(harness, {
      onboardingAccepted: true,
      packageCode: 'essential_audit',
      locales: ['en-CA'],
    });
    const plan = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!plan.ok) return;
    const template = await seedTemplate(harness, { locale: 'fr-CA' });

    const result = await addScenarioToPlan(
      harness.as(analyst),
      ORG_ID,
      plan.value.id,
      { scenarioTemplateId: template.id, locale: 'fr-CA' },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('enforces the entitlement scenario cap at build time', async () => {
    harness = createHarness();
    await seedProject(harness, {
      onboardingAccepted: true,
      packageCode: 'essential_audit',
      locales: ['en-CA'],
    });
    const plan = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!plan.ok) return;

    for (let i = 0; i < 25; i += 1) {
      const template = await seedTemplate(harness);
      const added = await addScenarioToPlan(
        harness.as(analyst),
        ORG_ID,
        plan.value.id,
        { scenarioTemplateId: template.id, locale: 'en-CA' },
      );
      expect(added.ok, `scenario ${i + 1}`).toBe(true);
    }

    const template = await seedTemplate(harness);
    const overflow = await addScenarioToPlan(
      harness.as(analyst),
      ORG_ID,
      plan.value.id,
      { scenarioTemplateId: template.id, locale: 'en-CA' },
    );
    expect(overflow).toMatchObject({
      ok: false,
      code: 'ENTITLEMENT_EXHAUSTED',
    });
  });

  it('refuses to modify an approved plan', async () => {
    const template = await seedTemplate(harness);
    await addScenarioToPlan(harness.as(analyst), ORG_ID, planId, {
      scenarioTemplateId: template.id,
      locale: 'en-CA',
    });
    await approvePlan(harness.as(senior), ORG_ID, planId);

    const another = await seedTemplate(harness);
    const result = await addScenarioToPlan(
      harness.as(analyst),
      ORG_ID,
      planId,
      {
        scenarioTemplateId: another.id,
        locale: 'en-CA',
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'IMMUTABLE' });
  });
});

describe('planCoverage', () => {
  it('counts matched pairs only when both halves are present', async () => {
    const plan = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!plan.ok) return;

    const en = await seedTemplate(harness, { locale: 'en-CA' });
    const fr = await seedTemplate(harness, { locale: 'fr-CA' });
    const lonely = await seedTemplate(harness, { locale: 'en-CA' });

    await addScenarioToPlan(harness.as(analyst), ORG_ID, plan.value.id, {
      scenarioTemplateId: en.id,
      locale: 'en-CA',
      bilingualPairId: 'pair_1',
    });
    await addScenarioToPlan(harness.as(analyst), ORG_ID, plan.value.id, {
      scenarioTemplateId: fr.id,
      locale: 'fr-CA',
      bilingualPairId: 'pair_1',
    });
    await addScenarioToPlan(harness.as(analyst), ORG_ID, plan.value.id, {
      scenarioTemplateId: lonely.id,
      locale: 'en-CA',
      bilingualPairId: 'pair_2',
    });

    const coverage = await planCoverage(
      harness.as(analyst),
      ORG_ID,
      plan.value.id,
    );
    expect(coverage.ok).toBe(true);
    if (!coverage.ok) return;

    expect(coverage.value.matchedPairs).toBe(1);
    expect(coverage.value.unpairedLocaleScenarios).toBe(1);
    expect(coverage.value.byLocale['en-CA']).toBe(2);
    expect(coverage.value.byLocale['fr-CA']).toBe(1);
  });

  it('reports missing required categories as a risk gap', async () => {
    const plan = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!plan.ok) return;
    const template = await seedTemplate(harness, {
      category: 'policy_accuracy',
    });
    await addScenarioToPlan(harness.as(analyst), ORG_ID, plan.value.id, {
      scenarioTemplateId: template.id,
      locale: 'en-CA',
    });

    const coverage = await planCoverage(
      harness.as(analyst),
      ORG_ID,
      plan.value.id,
    );
    if (!coverage.ok) return;
    expect(coverage.value.missingCategories).toHaveLength(
      REQUIRED_CATEGORIES.length - 1,
    );
    expect(coverage.value.missingCategories).not.toContain('policy_accuracy');
    expect(coverage.value.remaining).toBe(74);
  });
});

describe('approvePlan', () => {
  it('freezes the plan and records the approver', async () => {
    const plan = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!plan.ok) return;
    const template = await seedTemplate(harness);
    await addScenarioToPlan(harness.as(analyst), ORG_ID, plan.value.id, {
      scenarioTemplateId: template.id,
      locale: 'en-CA',
    });

    const result = await approvePlan(harness.as(senior), ORG_ID, plan.value.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('approved');
    expect(result.value.approvedBy).toBe(senior.userId);
    expect(result.value.approvedAt).not.toBeNull();
  });

  it('refuses an empty plan', async () => {
    const plan = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!plan.ok) return;
    const result = await approvePlan(harness.as(senior), ORG_ID, plan.value.id);
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('does not let a plain analyst approve', async () => {
    const plan = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!plan.ok) return;
    const template = await seedTemplate(harness);
    await addScenarioToPlan(harness.as(analyst), ORG_ID, plan.value.id, {
      scenarioTemplateId: template.id,
      locale: 'en-CA',
    });

    const result = await approvePlan(
      harness.as(analyst),
      ORG_ID,
      plan.value.id,
    );
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });

  it('supersedes the previously approved plan so exactly one is current', async () => {
    const first = await createPlan(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!first.ok) return;
    const t1 = await seedTemplate(harness);
    await addScenarioToPlan(harness.as(analyst), ORG_ID, first.value.id, {
      scenarioTemplateId: t1.id,
      locale: 'en-CA',
    });
    await approvePlan(harness.as(senior), ORG_ID, first.value.id);

    const second = await createPlan(
      harness.as(analyst),
      ORG_ID,
      PROJECT_ID,
      'Added privacy scenarios.',
    );
    if (!second.ok) return;
    const t2 = await seedTemplate(harness);
    await addScenarioToPlan(harness.as(analyst), ORG_ID, second.value.id, {
      scenarioTemplateId: t2.id,
      locale: 'en-CA',
    });
    await approvePlan(harness.as(senior), ORG_ID, second.value.id);

    const plans = await harness.context.data.auditPlans.listForProject(
      ORG_ID,
      PROJECT_ID,
    );
    expect(plans.filter((p) => p.status === 'approved')).toHaveLength(1);
    expect(plans.find((p) => p.version === 1)?.status).toBe('superseded');
  });
});
