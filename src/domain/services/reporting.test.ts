import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  approveReport,
  checkRelease,
  composeReport,
  confirmFinding,
  correctReport,
  createFinding,
  draftReport,
  previewReport,
  releaseReport,
  updateFindingStatus,
  type CreateFindingInput,
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

function findingInput(
  overrides: Partial<CreateFindingInput> = {},
): CreateFindingInput {
  return {
    severity: 'medium',
    dimension: 'factual_policy_accuracy',
    title: 'Refund window misstated',
    summary: 'The assistant stated seven days instead of thirty.',
    expectedBehaviour: 'State the thirty-day refund window.',
    observedBehaviour: 'Stated a seven-day window.',
    customerImpact: 'Customers may believe they have lost eligibility.',
    recommendedRemediation: 'Correct the refund entry in the knowledge base.',
    confidence: 'high',
    evidence: [{ testCaseId: 'case_1', knowledgeSourceId: 'ks_1' }],
    ...overrides,
  };
}

/**
 * Drive a project all the way to a run sitting in `report_draft` with every
 * case reviewed. This is the state a report is composed from.
 */
async function reviewedRun(
  h: Harness,
  options: { paired?: boolean; count?: number } = {},
): Promise<{ runId: string; caseIds: string[] }> {
  await seedProject(h, { onboardingAccepted: true, status: 'planning' });
  await seedAuthorization(h);
  await seedApprovedPlan(h, {
    count: options.count ?? 1,
    locales: options.paired ? ['en-CA', 'fr-CA'] : ['en-CA'],
    ...(options.paired ? { paired: true } : {}),
  });

  const created = await createRun(h.as(analyst), ORG_ID, PROJECT_ID);
  if (!created.ok) throw new Error(`run creation failed: ${created.message}`);
  const runId = created.value.run.id;

  await transitionRun(h.as(owner), ORG_ID, runId, 'approved');
  await transitionRun(h.as(analyst), ORG_ID, runId, 'queued');
  await transitionRun(h.as(analyst), ORG_ID, runId, 'running');

  const caseIds: string[] = [];
  for (const testCase of created.value.cases) {
    await captureResponse(h.as(analyst), ORG_ID, testCase.id, {
      turns: [
        { role: 'tester', content: 'How long do I have for a refund?' },
        { role: 'system', content: 'You have seven days from delivery.' },
      ],
      latencyMs: 400,
    });
    await evaluateCase(h.as(analyst), ORG_ID, testCase.id);
    const reviewed = await reviewEvaluation(
      h.as(analyst),
      ORG_ID,
      testCase.id,
      fullReview(4),
    );
    if (!reviewed.ok) throw new Error(`review failed: ${reviewed.message}`);
    caseIds.push(testCase.id);
  }

  await transitionRun(h.as(analyst), ORG_ID, runId, 'review_required');
  await transitionRun(h.as(analyst), ORG_ID, runId, 'report_draft');

  return { runId, caseIds };
}

/** A run driven all the way to a released report. */
async function releasedReport(h: Harness): Promise<{
  runId: string;
  reportId: string;
}> {
  const { runId } = await reviewedRun(h);
  const draft = await draftReport(h.as(analyst), ORG_ID, runId, 'en');
  if (!draft.ok) throw new Error(`draft failed: ${draft.message}`);
  await previewReport(h.as(analyst), ORG_ID, draft.value.id);
  await approveReport(h.as(senior), ORG_ID, draft.value.id);
  const released = await releaseReport(h.as(senior), ORG_ID, draft.value.id);
  if (!released.ok) throw new Error(`release failed: ${released.message}`);
  return { runId, reportId: draft.value.id };
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

describe('createFinding', () => {
  it('refuses a finding with no evidence', async () => {
    // 10.1: findings are "evidence-linked". One with nothing to point at cannot
    // be defended when the customer disputes it.
    const { runId } = await reviewedRun(harness);
    const result = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ evidence: [] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('refuses a finding with a blank required narrative field', async () => {
    const { runId } = await reviewedRun(harness);
    const result = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ customerImpact: '   ' }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('customerImpact');
  });

  it('assigns sequential references within a project', async () => {
    const { runId } = await reviewedRun(harness);
    const first = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput(),
    );
    const second = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ title: 'Second issue' }),
    );
    expect(first.ok && first.value.reference).toBe('F-001');
    expect(second.ok && second.value.reference).toBe('F-002');
  });

  it('refuses a client role', async () => {
    const { runId } = await reviewedRun(harness);
    const result = await createFinding(
      harness.as(clientOwner),
      ORG_ID,
      runId,
      findingInput(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('ROLE_NOT_PERMITTED');
  });

  it('records a critical finding as a critical-risk audit event', async () => {
    const { runId } = await reviewedRun(harness);
    await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'critical' }),
    );
    const events = await harness.context.data.auditEvents.list({
      organizationId: ORG_ID,
      action: 'finding.created',
      limit: 10,
    });
    expect(events[0]?.riskLevel).toBe('critical');
  });
});

describe('confirmFinding', () => {
  it('downgrades a low-confidence critical until a senior confirms it', async () => {
    // 10.8: a low-confidence candidate may not be *labelled* Critical without
    // senior confirmation.
    const { runId } = await reviewedRun(harness);
    const created = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'critical', confidence: 'low' }),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const byAnalyst = await confirmFinding(
      harness.as(analyst),
      ORG_ID,
      created.value.id,
      false,
    );
    expect(byAnalyst.ok).toBe(true);
    if (!byAnalyst.ok) return;
    expect(byAnalyst.value.publishableSeverity).toBe('high');

    const bySenior = await confirmFinding(
      harness.as(senior),
      ORG_ID,
      created.value.id,
      true,
    );
    expect(bySenior.ok).toBe(true);
    if (!bySenior.ok) return;
    expect(bySenior.value.publishableSeverity).toBe('critical');
    expect(bySenior.value.finding.seniorConfirmedBy).toBe(senior.userId);
  });

  it('refuses senior confirmation from an ordinary analyst', async () => {
    const { runId } = await reviewedRun(harness);
    const created = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'critical' }),
    );
    if (!created.ok) throw new Error('setup failed');

    const result = await confirmFinding(
      harness.as(analyst),
      ORG_ID,
      created.value.id,
      true,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('ROLE_NOT_PERMITTED');
  });

  it('preserves the first human confirmer when a senior later confirms', async () => {
    const { runId } = await reviewedRun(harness);
    const created = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput(),
    );
    if (!created.ok) throw new Error('setup failed');

    await confirmFinding(harness.as(analyst), ORG_ID, created.value.id, false);
    const bySenior = await confirmFinding(
      harness.as(senior),
      ORG_ID,
      created.value.id,
      true,
    );
    expect(bySenior.ok && bySenior.value.finding.humanConfirmedBy).toBe(
      analyst.userId,
    );
  });
});

describe('updateFindingStatus', () => {
  it('refuses a transition the status machine does not allow', async () => {
    const { runId } = await reviewedRun(harness);
    const created = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput(),
    );
    if (!created.ok) throw new Error('setup failed');

    const result = await updateFindingStatus(
      harness.as(analyst),
      ORG_ID,
      created.value.id,
      'resolved',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INVALID_STATE');
  });

  it('lets only the client owner accept risk, with a reason and review date', async () => {
    const { runId } = await reviewedRun(harness);
    const created = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput(),
    );
    if (!created.ok) throw new Error('setup failed');
    const findingId = created.value.id;

    const reviewDate = new Date('2026-11-01T00:00:00Z');

    // An analyst cannot accept risk on the customer's behalf.
    const byAnalyst = await updateFindingStatus(
      harness.as(analyst),
      ORG_ID,
      findingId,
      'risk_accepted',
      { reason: 'Accepted by the business.', reviewDate },
    );
    expect(byAnalyst.ok).toBe(false);

    const noReviewDate = await updateFindingStatus(
      harness.as(clientOwner),
      ORG_ID,
      findingId,
      'risk_accepted',
      { reason: 'Accepted; the policy page is being rewritten anyway.' },
    );
    expect(noReviewDate.ok).toBe(false);

    const noReason = await updateFindingStatus(
      harness.as(clientOwner),
      ORG_ID,
      findingId,
      'risk_accepted',
      { reviewDate },
    );
    expect(noReason.ok).toBe(false);

    const accepted = await updateFindingStatus(
      harness.as(clientOwner),
      ORG_ID,
      findingId,
      'risk_accepted',
      {
        reason: 'Accepted; the policy page is being rewritten anyway.',
        reviewDate,
      },
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.value.status).toBe('risk_accepted');
    expect(accepted.value.riskAcceptedBy).toBe(clientOwner.userId);
    expect(accepted.value.riskReviewDate).toEqual(reviewDate);
    // Acceptance does not erase the finding (FR-FND-004).
    expect(accepted.value.severity).toBe('medium');
  });

  it('records the reason on the status history', async () => {
    const { runId } = await reviewedRun(harness);
    const created = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput(),
    );
    if (!created.ok) throw new Error('setup failed');

    // Remediation status is the customer's workflow, not the analyst's.
    await updateFindingStatus(
      harness.as(clientOwner),
      ORG_ID,
      created.value.id,
      'accepted',
      { reason: 'Confirmed with the vendor.' },
    );
    const history = harness.state.findingHistory.filter(
      (entry) => entry.findingId === created.value.id,
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.oldStatus).toBe('open');
    expect(history[0]?.reason).toBe('Confirmed with the vendor.');
  });
});

describe('composeReport', () => {
  it('reads approved scores only and reports the grade', async () => {
    const { runId } = await reviewedRun(harness);
    const composed = await composeReport(harness.as(analyst), ORG_ID, runId);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    // Every dimension approved at 4/5 => 80.
    expect(composed.value.score).toBe(80);
    expect(composed.value.grade).toBe('B');
    expect(composed.value.incomplete).toBe(false);
    expect(composed.value.scenariosCompleted).toBe(1);
  });

  it('never carries internal notes into the composition', async () => {
    // Mandatory E2E scenario 6: internal notes must not reach a report.
    const { runId } = await reviewedRun(harness);
    const secret = 'INTERNAL: the client has not paid the last invoice.';
    await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ internalNotes: secret }),
    );

    const composed = await composeReport(harness.as(analyst), ORG_ID, runId);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(JSON.stringify(composed.value)).not.toContain(secret);
    expect(composed.value.findings[0]).not.toHaveProperty('internalNotes');
  });

  it('applies the critical severity cap to the reported score', async () => {
    // 10.6: a confirmed, unresolved Critical caps the score at 49 / F.
    const { runId } = await reviewedRun(harness);
    const created = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'critical' }),
    );
    if (!created.ok) throw new Error('setup failed');
    await confirmFinding(harness.as(senior), ORG_ID, created.value.id, true);

    const composed = await composeReport(harness.as(analyst), ORG_ID, runId);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value.rawScore).toBe(80);
    expect(composed.value.score).toBeLessThanOrEqual(49);
    expect(composed.value.grade).toBe('F');
    expect(composed.value.capApplied).not.toBeNull();
  });

  it('does not cap on an unconfirmed critical', async () => {
    const { runId } = await reviewedRun(harness);
    await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'critical' }),
    );
    const composed = await composeReport(harness.as(analyst), ORG_ID, runId);
    expect(composed.ok && composed.value.score).toBe(80);
  });

  it('orders findings by descending severity', async () => {
    const { runId } = await reviewedRun(harness);
    await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'low', title: 'Low' }),
    );
    await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'critical', title: 'Critical' }),
    );
    await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'medium', title: 'Medium' }),
    );

    const composed = await composeReport(harness.as(analyst), ORG_ID, runId);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value.findings.map((f) => f.severity)).toEqual([
      'critical',
      'medium',
      'low',
    ]);
  });

  it('reports parity qualitatively below the publication threshold', async () => {
    // 10.7: a numeric parity index needs ten matched pairs. Two pairs is a
    // qualitative statement, not a number.
    const { runId } = await reviewedRun(harness, { paired: true, count: 2 });
    const composed = await composeReport(harness.as(analyst), ORG_ID, runId);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value.matchedPairCount).toBe(2);
    expect(composed.value.parityQualitativeOnly).toBe(true);
    expect(composed.value.parityIndex).toBeNull();
  });

  it('refuses a client role', async () => {
    const { runId } = await reviewedRun(harness);
    const composed = await composeReport(
      harness.as(clientOwner),
      ORG_ID,
      runId,
    );
    expect(composed.ok).toBe(false);
    if (composed.ok) return;
    expect(composed.code).toBe('ROLE_NOT_PERMITTED');
  });
});

describe('release gate', () => {
  it('blocks release while a high finding is unadjudicated', async () => {
    // Mandatory E2E scenario 11.
    const { runId } = await reviewedRun(harness);
    await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'high' }),
    );

    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');
    await previewReport(harness.as(analyst), ORG_ID, draft.value.id);
    await approveReport(harness.as(senior), ORG_ID, draft.value.id);

    const check = await checkRelease(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.value.canRelease).toBe(false);
    expect(check.value.blockers).toContain('CRITICAL_HIGH_NOT_ADJUDICATED');

    const released = await releaseReport(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(released.ok).toBe(false);
    if (released.ok) return;
    expect(released.code).toBe('INVALID_STATE');

    // The refusal is auditable, not silent.
    const events = await harness.context.data.auditEvents.list({
      organizationId: ORG_ID,
      action: 'report.release_blocked',
      limit: 10,
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.outcome).toBe('denied');
  });

  it('releases once the high finding is confirmed', async () => {
    const { runId } = await reviewedRun(harness);
    const created = await createFinding(
      harness.as(analyst),
      ORG_ID,
      runId,
      findingInput({ severity: 'high' }),
    );
    if (!created.ok) throw new Error('setup failed');
    await confirmFinding(harness.as(senior), ORG_ID, created.value.id, true);

    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');
    await previewReport(harness.as(analyst), ORG_ID, draft.value.id);
    await approveReport(harness.as(senior), ORG_ID, draft.value.id);

    const check = await checkRelease(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(check.ok && check.value.blockers).toEqual([]);

    const released = await releaseReport(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(released.ok).toBe(true);
    if (!released.ok) return;
    expect(released.value.status).toBe('released');
    expect(released.value.releasedBy).toBe(senior.userId);

    const run = await harness.context.data.runs.findById(ORG_ID, runId);
    expect(run?.state).toBe('released');
  });

  it('blocks release before a preview is generated', async () => {
    const { runId } = await reviewedRun(harness);
    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');

    const check = await checkRelease(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.value.blockers).toContain('PREVIEW_NOT_GENERATED');

    const released = await releaseReport(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(released.ok).toBe(false);
    if (released.ok) return;
    expect(released.message).toContain('previewed and approved');
  });

  it('blocks release when the report has not been approved', async () => {
    const { runId } = await reviewedRun(harness);
    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');
    await previewReport(harness.as(analyst), ORG_ID, draft.value.id);

    const released = await releaseReport(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(released.ok).toBe(false);
  });

  it('refuses release by an ordinary analyst', async () => {
    const { runId } = await reviewedRun(harness);
    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');
    await previewReport(harness.as(analyst), ORG_ID, draft.value.id);
    await approveReport(harness.as(senior), ORG_ID, draft.value.id);

    const released = await releaseReport(
      harness.as(analyst),
      ORG_ID,
      draft.value.id,
    );
    expect(released.ok).toBe(false);
    if (released.ok) return;
    expect(released.code).toBe('ROLE_NOT_PERMITTED');
  });

  it('blocks release when authorization has expired', async () => {
    // 16.9/23.1: authorization must be active for every test in the run.
    const { runId } = await reviewedRun(harness);
    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');
    await previewReport(harness.as(analyst), ORG_ID, draft.value.id);
    await approveReport(harness.as(senior), ORG_ID, draft.value.id);

    harness.advance(200 * 86_400_000);

    const check = await checkRelease(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.value.blockers).toContain('AUTHORIZATION_NOT_ACTIVE');
    expect(check.value.detail.join(' ')).toContain('Authorization');
  });

  it('blocks release when the run is not in report_draft', async () => {
    const { runId } = await reviewedRun(harness);
    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');
    await previewReport(harness.as(analyst), ORG_ID, draft.value.id);
    await approveReport(harness.as(senior), ORG_ID, draft.value.id);
    await transitionRun(
      harness.as(analyst),
      ORG_ID,
      runId,
      'review_required',
      'Reopening: a scenario needs re-running.',
    );

    const check = await checkRelease(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(check.ok && check.value.blockers).toContain(
      'RUN_NOT_IN_REPORT_DRAFT',
    );
  });

  it('gives a human-readable reason for every blocker', async () => {
    const { runId } = await reviewedRun(harness);
    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');

    const check = await checkRelease(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
    );
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.value.detail).toHaveLength(check.value.blockers.length);
    for (const detail of check.value.detail) {
      expect(detail.length).toBeGreaterThan(0);
    }
  });
});

describe('correctReport', () => {
  it('leaves the released report immutable and creates version 2', async () => {
    // Mandatory E2E scenario 12.
    const { reportId } = await releasedReport(harness);

    const corrected = await correctReport(
      harness.as(senior),
      ORG_ID,
      reportId,
      'The refund window was misstated in the summary.',
    );
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;

    expect(corrected.value.version).toBe(2);
    expect(corrected.value.status).toBe('draft');
    expect(corrected.value.releasedAt).toBeNull();
    expect(corrected.value.correctionReason).toContain('refund window');

    const original = await harness.context.data.reports.findById(
      ORG_ID,
      reportId,
    );
    expect(original?.status).toBe('superseded');
    expect(original?.supersededById).toBe(corrected.value.id);
    // The original's own content is untouched — only its status moved.
    expect(original?.version).toBe(1);
    expect(original?.releasedBy).toBe(senior.userId);
  });

  it('keeps the family identifier across versions', async () => {
    const { reportId } = await releasedReport(harness);
    const original = await harness.context.data.reports.findById(
      ORG_ID,
      reportId,
    );
    const corrected = await correctReport(
      harness.as(senior),
      ORG_ID,
      reportId,
      'Correction.',
    );
    expect(corrected.ok && corrected.value.familyId).toBe(original?.familyId);
  });

  it('refuses to correct a report that was never released', async () => {
    const { runId } = await reviewedRun(harness);
    const draft = await draftReport(harness.as(analyst), ORG_ID, runId, 'en');
    if (!draft.ok) throw new Error('setup failed');

    const result = await correctReport(
      harness.as(senior),
      ORG_ID,
      draft.value.id,
      'Correction.',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INVALID_STATE');
  });

  it('requires a correction reason', async () => {
    const { reportId } = await releasedReport(harness);
    const result = await correctReport(
      harness.as(senior),
      ORG_ID,
      reportId,
      '  ',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VALIDATION_FAILED');
  });

  it('refuses a second release of an already-released report', async () => {
    const { reportId } = await releasedReport(harness);
    const again = await releaseReport(harness.as(senior), ORG_ID, reportId);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.message).toContain('already been released');
  });

  it('refuses to re-preview a released report', async () => {
    const { reportId } = await releasedReport(harness);
    const result = await previewReport(harness.as(analyst), ORG_ID, reportId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INVALID_STATE');
  });
});
