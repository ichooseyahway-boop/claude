import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  listComments,
  listNotifications,
  listPortalFindings,
  listPortalProjects,
  markNotificationRead,
  postComment,
  readPortalReport,
  toClientFinding,
} from './portal';
import { deliveryQueue, releaseQueue } from './operations';
import {
  approveReport,
  createFinding,
  draftReport,
  previewReport,
  releaseReport,
} from './reporting';
import { evaluateCase, reviewEvaluation } from './evaluation';
import { captureResponse, createRun, transitionRun } from './execution';
import { DIMENSIONS } from '@/domain/scoring/dimensions';
import { EVALUATOR_SCHEMA_VERSION } from '@/domain/evaluation/schema';
import {
  resetProviderOverrides,
  setProviderOverrides,
} from '@/integrations/registry';
import type {
  AIProvider,
  EvaluationResponse,
  ProviderResult,
} from '@/integrations/contracts';
import {
  ORG_ID,
  OTHER_ORG_ID,
  PROJECT_ID,
  createHarness,
  makeActor,
  seedApprovedPlan,
  seedAuthorization,
  seedProject,
  type Harness,
} from './test-harness';

const analyst = makeActor('analyst');
const senior = makeActor('senior_analyst');
const owner = makeActor('platform_owner');
const clientOwner = makeActor('client_owner');
const clientViewer = makeActor('client_viewer');
const billingAdmin = makeActor('billing_admin');

const INTERNAL_NOTE =
  'INTERNAL: the client disputed our last invoice; tread carefully.';

let harness: Harness;

function okResponse(score: number): ProviderResult<EvaluationResponse> {
  return {
    ok: true,
    value: {
      proposal: {
        schemaVersion: EVALUATOR_SCHEMA_VERSION,
        scores: DIMENSIONS.map((dimension) => ({
          dimension,
          score,
          confidence: 'medium' as const,
          rationale: 'Rationale.',
          responseEvidence: [],
          policyEvidence: [],
        })),
        candidateFindings: [],
        uncertainties: [],
      } as EvaluationResponse['proposal'],
      modelIdentifier: 'fake-model',
      costMinor: 5,
      latencyMs: 200,
      retries: 0,
    },
  };
}

const fakeAI: AIProvider = {
  name: 'fake-ai',
  isConfigured: () => true,
  evaluate: async () => okResponse(4),
};

function fullReview(score: number) {
  return {
    scores: DIMENSIONS.map((dimension) => ({
      dimension,
      approvedScore: score,
      confidence: 'high' as const,
    })),
    caseConfidence: 'high' as const,
  };
}

/**
 * Drive a project to a released report carrying one finding whose internal
 * notes must never reach a customer.
 */
async function releasedProject(
  h: Harness,
  options: { organizationId?: string; projectId?: string } = {},
): Promise<{ runId: string; reportId: string; findingId: string }> {
  const organizationId = options.organizationId ?? ORG_ID;
  const projectId = options.projectId ?? PROJECT_ID;

  await seedProject(h, {
    organizationId,
    projectId,
    onboardingAccepted: true,
    status: 'planning',
  });
  await seedAuthorization(h, { organizationId, projectId });
  await seedApprovedPlan(h, { organizationId, projectId, count: 1 });

  const asAnalyst = h.as(makeActor('analyst', { organizationId }));
  const asOwner = h.as(makeActor('platform_owner', { organizationId }));
  const asSenior = h.as(makeActor('senior_analyst', { organizationId }));

  const created = await createRun(asAnalyst, organizationId, projectId);
  if (!created.ok) throw new Error(`run failed: ${created.message}`);
  const runId = created.value.run.id;

  await transitionRun(asOwner, organizationId, runId, 'approved');
  await transitionRun(asAnalyst, organizationId, runId, 'queued');
  await transitionRun(asAnalyst, organizationId, runId, 'running');

  for (const testCase of created.value.cases) {
    await captureResponse(asAnalyst, organizationId, testCase.id, {
      turns: [
        { role: 'tester', content: 'How long do I have for a refund?' },
        { role: 'system', content: 'You have seven days from delivery.' },
      ],
      latencyMs: 400,
    });
    await evaluateCase(asAnalyst, organizationId, testCase.id);
    await reviewEvaluation(
      asAnalyst,
      organizationId,
      testCase.id,
      fullReview(4),
    );
  }

  await transitionRun(asAnalyst, organizationId, runId, 'review_required');
  await transitionRun(asAnalyst, organizationId, runId, 'report_draft');

  const finding = await createFinding(asAnalyst, organizationId, runId, {
    severity: 'medium',
    dimension: 'factual_policy_accuracy',
    title: 'Refund window misstated',
    summary: 'The assistant stated seven days instead of thirty.',
    expectedBehaviour: 'State the thirty-day refund window.',
    observedBehaviour: 'Stated a seven-day window.',
    customerImpact: 'Customers may believe they have lost eligibility.',
    recommendedRemediation: 'Correct the refund entry in the knowledge base.',
    confidence: 'high',
    internalNotes: INTERNAL_NOTE,
    evidence: [{ testCaseId: created.value.cases[0]!.id }],
  });
  if (!finding.ok) throw new Error(`finding failed: ${finding.message}`);

  const draft = await draftReport(asAnalyst, organizationId, runId, 'en');
  if (!draft.ok) throw new Error(`draft failed: ${draft.message}`);
  await previewReport(asAnalyst, organizationId, draft.value.id);
  await approveReport(asSenior, organizationId, draft.value.id);
  const released = await releaseReport(
    asSenior,
    organizationId,
    draft.value.id,
  );
  if (!released.ok) throw new Error(`release failed: ${released.message}`);

  return { runId, reportId: draft.value.id, findingId: finding.value.id };
}

beforeEach(() => {
  harness = createHarness();
  process.env.FEATURE_AI_EVALUATION = 'true';
  setProviderOverrides({ ai: fakeAI });
});

afterEach(() => {
  resetProviderOverrides();
  delete process.env.FEATURE_AI_EVALUATION;
});

describe('internal notes never reach a customer', () => {
  it('strips them from a portal finding list', async () => {
    // Mandatory E2E scenario 6, at the portal boundary this time.
    await releasedProject(harness);

    const findings = await listPortalFindings(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
    );
    expect(findings.ok).toBe(true);
    if (!findings.ok) return;

    expect(findings.value).toHaveLength(1);
    expect(JSON.stringify(findings.value)).not.toContain(INTERNAL_NOTE);
    expect(findings.value[0]).not.toHaveProperty('internalNotes');
  });

  it('strips them from a report read', async () => {
    const { reportId } = await releasedProject(harness);

    const result = await readPortalReport(
      harness.as(clientOwner),
      ORG_ID,
      reportId,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result.value)).not.toContain(INTERNAL_NOTE);
  });

  it('strips them even for an internal reader, because the type omits them', async () => {
    // The mapper is not role-conditional. An analyst who needs internal notes
    // reads the finding record, not the client projection — so there is no
    // branch here that could be got wrong.
    const { reportId } = await releasedProject(harness);
    const result = await readPortalReport(
      harness.as(analyst),
      ORG_ID,
      reportId,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result.value.findings)).not.toContain(INTERNAL_NOTE);
  });

  it('carries new Finding fields through while omitting only internalNotes', async () => {
    const { findingId } = await releasedProject(harness);
    const finding = await harness.context.data.findings.findById(
      ORG_ID,
      findingId,
    );
    expect(finding).not.toBeNull();
    if (!finding) return;

    const client = toClientFinding(finding);
    const expected = Object.keys(finding).filter((k) => k !== 'internalNotes');
    expect(Object.keys(client).sort()).toEqual(expected.sort());
  });
});

describe('a customer sees only released work', () => {
  it('hides findings that exist only on a draft report', async () => {
    await seedProject(harness, {
      onboardingAccepted: true,
      status: 'planning',
    });
    await seedAuthorization(harness);
    await seedApprovedPlan(harness, { count: 1 });

    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) throw new Error('setup failed');

    await createFinding(harness.as(analyst), ORG_ID, created.value.run.id, {
      severity: 'critical',
      dimension: 'safety_and_privacy',
      title: 'Not yet released',
      summary: 'An unreleased judgement.',
      expectedBehaviour: 'x',
      observedBehaviour: 'y',
      customerImpact: 'z',
      recommendedRemediation: 'w',
      confidence: 'low',
      evidence: [{ testCaseId: created.value.cases[0]!.id }],
    });

    const findings = await listPortalFindings(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
    );
    expect(findings.ok && findings.value).toHaveLength(0);
  });

  it('reports a draft as not found rather than not permitted', async () => {
    // The difference would confirm that a report about them exists and is
    // being withheld, which is itself a disclosure.
    await seedProject(harness, {
      onboardingAccepted: true,
      status: 'planning',
    });
    await seedAuthorization(harness);
    await seedApprovedPlan(harness, { count: 1 });
    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) throw new Error('setup failed');
    const draft = await draftReport(
      harness.as(analyst),
      ORG_ID,
      created.value.run.id,
      'en',
    );
    if (!draft.ok) throw new Error('setup failed');

    const asClient = await readPortalReport(
      harness.as(clientOwner),
      ORG_ID,
      draft.value.id,
    );
    expect(asClient.ok).toBe(false);
    if (asClient.ok) return;
    expect(asClient.code).toBe('NOT_FOUND');

    // The same report is readable by an analyst.
    const asAnalyst = await readPortalReport(
      harness.as(analyst),
      ORG_ID,
      draft.value.id,
    );
    expect(asAnalyst.ok).toBe(true);
  });

  it('lets a client read the released report', async () => {
    const { reportId } = await releasedProject(harness);
    const result = await readPortalReport(
      harness.as(clientOwner),
      ORG_ID,
      reportId,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.report.status).toBe('released');
    expect(result.value.findings).toHaveLength(1);
  });

  it('records every report view for the access log', async () => {
    const { reportId } = await releasedProject(harness);
    await readPortalReport(harness.as(clientOwner), ORG_ID, reportId);

    const access = harness.state.reportAccess.filter(
      (a) => a.reportId === reportId,
    );
    expect(access).toHaveLength(1);
    expect(access[0]?.action).toBe('viewed');
    expect(access[0]?.userId).toBe(clientOwner.userId);
  });
});

describe('tenant isolation at the service boundary', () => {
  it('never returns another organization’s projects', async () => {
    await releasedProject(harness);
    await releasedProject(harness, {
      organizationId: OTHER_ORG_ID,
      projectId: 'proj_other',
    });

    const mine = await listPortalProjects(harness.as(clientOwner), ORG_ID);
    expect(mine.ok).toBe(true);
    if (!mine.ok) return;
    expect(mine.value).toHaveLength(1);
    expect(mine.value[0]?.project.organizationId).toBe(ORG_ID);
  });

  it('refuses a read in an organization the actor does not belong to', async () => {
    await releasedProject(harness, {
      organizationId: OTHER_ORG_ID,
      projectId: 'proj_other',
    });

    const result = await listPortalProjects(
      harness.as(clientOwner),
      OTHER_ORG_ID,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NOT_A_MEMBER');
  });

  it('honours an analyst’s project scope', async () => {
    // 7.2: a scoped analyst reaches only assigned projects.
    await releasedProject(harness);
    const scoped = makeActor('analyst', {
      userId: 'user_scoped',
      projectScope: ['proj_elsewhere'],
    });

    const result = await listPortalFindings(
      harness.as(scoped),
      ORG_ID,
      PROJECT_ID,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('PROJECT_OUT_OF_SCOPE');
  });

  it('gives a billing admin no access to findings', async () => {
    // 7.5: a billing-only member sees billing, not audit content.
    await releasedProject(harness);
    const result = await listPortalFindings(
      harness.as(billingAdmin),
      ORG_ID,
      PROJECT_ID,
    );
    expect(result.ok).toBe(false);
  });
});

describe('portal project summaries', () => {
  it('counts open findings from released reports only', async () => {
    await releasedProject(harness);
    const result = await listPortalProjects(harness.as(clientOwner), ORG_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = result.value[0];
    expect(summary?.releasedReportCount).toBe(1);
    expect(summary?.openFindingCount).toBe(1);
    expect(summary?.criticalOrHighOpenCount).toBe(0);
    expect(summary?.latestReport?.status).toBe('released');
  });
});

describe('comments', () => {
  it('hides internal notes from a client and shows them to an analyst', async () => {
    await releasedProject(harness);

    await postComment(harness.as(analyst), ORG_ID, {
      objectType: 'project',
      objectId: PROJECT_ID,
      projectId: PROJECT_ID,
      content: 'Internal: chase the missing policy PDF.',
      visibility: 'internal',
    });
    await postComment(harness.as(analyst), ORG_ID, {
      objectType: 'project',
      objectId: PROJECT_ID,
      projectId: PROJECT_ID,
      content: 'We have started the review.',
      visibility: 'customer',
    });

    const asClient = await listComments(
      harness.as(clientOwner),
      ORG_ID,
      'project',
      PROJECT_ID,
      { projectId: PROJECT_ID },
    );
    expect(asClient.ok).toBe(true);
    if (!asClient.ok) return;
    expect(asClient.value).toHaveLength(1);
    expect(asClient.value[0]?.visibility).toBe('customer');

    const asAnalyst = await listComments(
      harness.as(analyst),
      ORG_ID,
      'project',
      PROJECT_ID,
      { projectId: PROJECT_ID },
    );
    expect(asAnalyst.ok && asAnalyst.value).toHaveLength(2);
  });

  it('refuses an internal comment from a client role', async () => {
    await releasedProject(harness);
    const result = await postComment(harness.as(clientOwner), ORG_ID, {
      objectType: 'project',
      objectId: PROJECT_ID,
      projectId: PROJECT_ID,
      content: 'Trying to write internally.',
      visibility: 'internal',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('ROLE_NOT_PERMITTED');
  });

  it('refuses an empty comment', async () => {
    await releasedProject(harness);
    const result = await postComment(harness.as(clientOwner), ORG_ID, {
      objectType: 'project',
      objectId: PROJECT_ID,
      projectId: PROJECT_ID,
      content: '   ',
      visibility: 'customer',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses any comment from a read-only viewer', async () => {
    await releasedProject(harness);
    const result = await postComment(harness.as(clientViewer), ORG_ID, {
      objectType: 'project',
      objectId: PROJECT_ID,
      projectId: PROJECT_ID,
      content: 'A viewer trying to comment.',
      visibility: 'customer',
    });
    expect(result.ok).toBe(false);
  });
});

describe('notifications', () => {
  it('returns only the signed-in user’s notifications', async () => {
    await harness.context.data.notifications.create({
      id: 'notif_1',
      organizationId: ORG_ID,
      userId: clientOwner.userId,
      category: 'report_released',
      contentKey: 'notifications.reportReleased',
      contentParams: {},
      targetPath: '/app/reports/report_1',
      readAt: null,
      createdAt: new Date(),
    });
    await harness.context.data.notifications.create({
      id: 'notif_2',
      organizationId: ORG_ID,
      userId: 'someone_else',
      category: 'report_released',
      contentKey: 'notifications.reportReleased',
      contentParams: {},
      targetPath: null,
      readAt: null,
      createdAt: new Date(),
    });

    const result = await listNotifications(harness.as(clientOwner));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.id).toBe('notif_1');
  });

  it('marks one read without touching the rest', async () => {
    await harness.context.data.notifications.create({
      id: 'notif_1',
      organizationId: ORG_ID,
      userId: clientOwner.userId,
      category: 'report_released',
      contentKey: 'notifications.reportReleased',
      contentParams: {},
      targetPath: null,
      readAt: null,
      createdAt: new Date(),
    });

    await markNotificationRead(harness.as(clientOwner), 'notif_1');
    const unread = await listNotifications(harness.as(clientOwner), true);
    expect(unread.ok && unread.value).toHaveLength(0);
  });

  it('refuses an unauthenticated read', async () => {
    const result = await listNotifications(harness.as(null));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NOT_AUTHENTICATED');
  });
});

describe('operations queues', () => {
  it('shows an internal role the active projects across tenants', async () => {
    await releasedProject(harness);
    await seedProject(harness, {
      organizationId: OTHER_ORG_ID,
      projectId: 'proj_other',
      status: 'executing',
    });

    const crossTenant = makeActor('platform_owner', { userId: 'user_ops' });
    crossTenant.memberships.push({
      id: 'mem_ops_2',
      organizationId: OTHER_ORG_ID,
      userId: 'user_ops',
      role: 'platform_owner',
      projectScope: null,
      acceptedAt: new Date('2026-01-01T00:00:00Z'),
      revokedAt: null,
    });

    const queue = await deliveryQueue(harness.as(crossTenant));
    expect(queue.ok).toBe(true);
    if (!queue.ok) return;
    expect(queue.value.map((i) => i.project.id)).toContain('proj_other');
  });

  it('omits organizations the actor does not belong to', async () => {
    await seedProject(harness, { status: 'executing' });
    await seedProject(harness, {
      organizationId: OTHER_ORG_ID,
      projectId: 'proj_other',
      status: 'executing',
    });

    const queue = await deliveryQueue(harness.as(owner));
    expect(queue.ok).toBe(true);
    if (!queue.ok) return;
    expect(queue.value.map((i) => i.project.organizationId)).toEqual([ORG_ID]);
  });

  it('shows a client role nothing at all', async () => {
    await seedProject(harness, { status: 'executing' });
    const queue = await deliveryQueue(harness.as(clientOwner));
    expect(queue.ok && queue.value).toHaveLength(0);
  });

  it('sorts overdue projects first and undated projects last', async () => {
    await seedProject(harness, { projectId: 'proj_a', status: 'executing' });
    await seedProject(harness, { projectId: 'proj_b', status: 'executing' });
    await seedProject(harness, { projectId: 'proj_c', status: 'executing' });

    await harness.context.data.projects.update(ORG_ID, 'proj_a', {
      name: 'A undated',
      dueDate: null,
    });
    await harness.context.data.projects.update(ORG_ID, 'proj_b', {
      name: 'B overdue',
      dueDate: new Date('2026-01-01T00:00:00Z'),
    });
    await harness.context.data.projects.update(ORG_ID, 'proj_c', {
      name: 'C future',
      dueDate: new Date('2027-01-01T00:00:00Z'),
    });

    const queue = await deliveryQueue(harness.as(owner));
    expect(queue.ok).toBe(true);
    if (!queue.ok) return;
    expect(queue.value.map((i) => i.project.id)).toEqual([
      'proj_b',
      'proj_c',
      'proj_a',
    ]);
    expect(queue.value[0]?.overdue).toBe(true);
  });

  it('shows why each report in the release queue is stuck', async () => {
    await seedProject(harness, {
      onboardingAccepted: true,
      status: 'analyst_review',
    });
    await seedAuthorization(harness);
    await seedApprovedPlan(harness, { count: 1 });
    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) throw new Error('setup failed');
    await draftReport(harness.as(analyst), ORG_ID, created.value.run.id, 'en');

    const queue = await releaseQueue(harness.as(senior));
    expect(queue.ok).toBe(true);
    if (!queue.ok) return;
    expect(queue.value).toHaveLength(1);

    const item = queue.value[0]!;
    expect(item.check.canRelease).toBe(false);
    // The blocker is visible from the queue, without opening the report.
    expect(item.check.blockers).toContain('RUN_NOT_IN_REPORT_DRAFT');
    expect(item.check.detail.length).toBe(item.check.blockers.length);
  });

  it('excludes released and superseded reports from the release queue', async () => {
    await releasedProject(harness);
    const queue = await releaseQueue(harness.as(senior));
    expect(queue.ok && queue.value).toHaveLength(0);
  });

  it('refuses the release queue to an ordinary analyst', async () => {
    await seedProject(harness, { status: 'analyst_review' });
    const queue = await releaseQueue(harness.as(analyst));
    expect(queue.ok && queue.value).toHaveLength(0);
  });
});
