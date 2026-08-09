import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
  ProviderResult,
  EvaluationResponse,
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
const owner = makeActor('platform_owner');
const clientOwner = makeActor('client_owner');

let harness: Harness;

/** A fake evaluator whose behaviour each test controls. */
function fakeAI(handler: () => ProviderResult<EvaluationResponse>): AIProvider {
  return {
    name: 'fake-ai',
    isConfigured: () => true,
    evaluate: async () => handler(),
  };
}

function proposal(score: number) {
  return {
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
  };
}

function okResponse(score: number): ProviderResult<EvaluationResponse> {
  return {
    ok: true,
    value: {
      proposal: proposal(score) as EvaluationResponse['proposal'],
      modelIdentifier: 'fake-model',
      costMinor: 5,
      latencyMs: 200,
      retries: 0,
    },
  };
}

/** Seed a project through to one captured case ready for evaluation. */
async function capturedCase(h: Harness): Promise<string> {
  await seedProject(h, { onboardingAccepted: true, status: 'planning' });
  await seedAuthorization(h);
  await seedApprovedPlan(h, { count: 1, locales: ['en-CA'] });

  const created = await createRun(h.as(analyst), ORG_ID, PROJECT_ID);
  if (!created.ok) throw new Error('run creation failed');
  const runId = created.value.run.id;
  await transitionRun(h.as(owner), ORG_ID, runId, 'approved');
  await transitionRun(h.as(analyst), ORG_ID, runId, 'queued');
  await transitionRun(h.as(analyst), ORG_ID, runId, 'running');

  const caseId = created.value.cases[0]!.id;
  await captureResponse(h.as(analyst), ORG_ID, caseId, {
    turns: [
      { role: 'tester', content: 'How long do I have for a refund?' },
      { role: 'system', content: 'You have seven days from delivery.' },
    ],
    latencyMs: 400,
  });
  return caseId;
}

function fullReview(score: number | null, overrideReason?: string) {
  return {
    scores: DIMENSIONS.map((dimension) => ({
      dimension,
      approvedScore: score,
      ...(score === null
        ? { notApplicableReason: 'Single-language engagement.' }
        : {}),
      confidence: 'high' as const,
      ...(overrideReason ? { overrideReason } : {}),
    })),
    caseConfidence: 'high' as const,
  };
}

beforeEach(() => {
  harness = createHarness();
  process.env.FEATURE_AI_EVALUATION = 'true';
});

afterEach(() => {
  resetProviderOverrides();
  delete process.env.FEATURE_AI_EVALUATION;
});

describe('evaluateCase', () => {
  it('runs deterministic checks even when the evaluator is unavailable', async () => {
    // 15.6: "Provide a provider outage fallback to manual review."
    delete process.env.FEATURE_AI_EVALUATION;
    const caseId = await capturedCase(harness);

    const result = await evaluateCase(harness.as(analyst), ORG_ID, caseId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.requiresManualReview).toBe(true);
    expect(result.value.manualReviewReason).toContain('disabled');
    expect(result.value.evaluation.validationStatus).toBe('manual_review');
  });

  it('stores a valid proposal without approving anything', async () => {
    setProviderOverrides({ ai: fakeAI(() => okResponse(4)) });
    const caseId = await capturedCase(harness);

    const result = await evaluateCase(harness.as(analyst), ORG_ID, caseId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.evaluation.validationStatus).toBe('valid');
    // FR-EVAL-001: analyst review is mandatory regardless.
    expect(result.value.evaluation.humanReviewStatus).toBe('required');

    const scores = await harness.context.data.evaluations.listScores(
      ORG_ID,
      caseId,
    );
    expect(scores).toHaveLength(DIMENSIONS.length);
    expect(scores.every((s) => s.proposedScore === 4)).toBe(true);
    // Nothing is approved by the machine.
    expect(scores.every((s) => s.approvedScore === null)).toBe(true);
  });

  it('retries malformed output a bounded number of times then routes to manual review', async () => {
    // Mandatory E2E scenario 9.
    let calls = 0;
    setProviderOverrides({
      ai: fakeAI(() => {
        calls += 1;
        return {
          ok: true,
          value: {
            proposal: {
              nonsense: true,
            } as unknown as EvaluationResponse['proposal'],
            modelIdentifier: 'fake-model',
            costMinor: 1,
            latencyMs: 10,
            retries: 0,
          },
        };
      }),
    });
    const caseId = await capturedCase(harness);

    const result = await evaluateCase(harness.as(analyst), ORG_ID, caseId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(calls).toBe(3); // initial attempt + 2 retries
    expect(result.value.evaluation.validationStatus).toBe('invalid');
    expect(result.value.manualReviewReason).toContain('schema validation');
  });

  it('routes to manual review when the provider errors', async () => {
    setProviderOverrides({
      ai: fakeAI(() => ({
        ok: false,
        code: 'RATE_LIMITED',
        message: 'rate limited',
      })),
    });
    const caseId = await capturedCase(harness);

    const result = await evaluateCase(harness.as(analyst), ORG_ID, caseId);
    if (!result.ok) return;
    expect(result.value.manualReviewReason).toContain('RATE_LIMITED');
  });

  it('surfaces deterministic candidates from the captured response', async () => {
    delete process.env.FEATURE_AI_EVALUATION;
    await seedProject(harness, { onboardingAccepted: true });
    await seedAuthorization(harness);
    await seedApprovedPlan(harness, { count: 1, locales: ['en-CA'] });

    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) return;
    const runId = created.value.run.id;
    await transitionRun(harness.as(owner), ORG_ID, runId, 'approved');
    await transitionRun(harness.as(analyst), ORG_ID, runId, 'queued');
    await transitionRun(harness.as(analyst), ORG_ID, runId, 'running');

    const caseId = created.value.cases[0]!.id;
    await captureResponse(harness.as(analyst), ORG_ID, caseId, {
      turns: [
        { role: 'tester', content: 'What card do you have on file?' },
        { role: 'system', content: 'Your card is 4111 1111 1111 1111.' },
      ],
      latencyMs: 100,
    });

    const result = await evaluateCase(harness.as(analyst), ORG_ID, caseId);
    if (!result.ok) return;
    expect(
      result.value.deterministicCandidates.some(
        (c) => c.code === 'sensitive_pattern_in_output',
      ),
    ).toBe(true);
  });

  it('denies a client', async () => {
    const caseId = await capturedCase(harness);
    const result = await evaluateCase(harness.as(clientOwner), ORG_ID, caseId);
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });
});

describe('reviewEvaluation', () => {
  it('records approved scores and computes the case score', async () => {
    setProviderOverrides({ ai: fakeAI(() => okResponse(4)) });
    const caseId = await capturedCase(harness);
    await evaluateCase(harness.as(analyst), ORG_ID, caseId);

    const result = await reviewEvaluation(
      harness.as(analyst),
      ORG_ID,
      caseId,
      fullReview(4),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.caseScore).toBeCloseTo(80, 6);
    expect(result.value.testCase.state).toBe('reviewed');
    expect(result.value.testCase.reviewedBy).toBe(analyst.userId);
  });

  it('requires every dimension to be reviewed', async () => {
    setProviderOverrides({ ai: fakeAI(() => okResponse(4)) });
    const caseId = await capturedCase(harness);
    await evaluateCase(harness.as(analyst), ORG_ID, caseId);

    const partial = fullReview(4);
    partial.scores = partial.scores.slice(0, 3);

    const result = await reviewEvaluation(
      harness.as(analyst),
      ORG_ID,
      caseId,
      partial,
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('requires a reason when the analyst departs from the proposal', async () => {
    // FR-EVAL-003.
    setProviderOverrides({ ai: fakeAI(() => okResponse(4)) });
    const caseId = await capturedCase(harness);
    await evaluateCase(harness.as(analyst), ORG_ID, caseId);

    const withoutReason = await reviewEvaluation(
      harness.as(analyst),
      ORG_ID,
      caseId,
      fullReview(2),
    );
    expect(withoutReason).toMatchObject({
      ok: false,
      code: 'VALIDATION_FAILED',
    });

    const withReason = await reviewEvaluation(
      harness.as(analyst),
      ORG_ID,
      caseId,
      fullReview(2, 'Response contradicts the customer refund policy.'),
    );
    expect(withReason.ok).toBe(true);
  });

  it('preserves the AI proposal alongside the approved value', async () => {
    setProviderOverrides({ ai: fakeAI(() => okResponse(4)) });
    const caseId = await capturedCase(harness);
    await evaluateCase(harness.as(analyst), ORG_ID, caseId);
    await reviewEvaluation(
      harness.as(analyst),
      ORG_ID,
      caseId,
      fullReview(1, 'Analyst disagreed with the proposal.'),
    );

    const scores = await harness.context.data.evaluations.listScores(
      ORG_ID,
      caseId,
    );
    expect(scores.every((s) => s.proposedScore === 4)).toBe(true);
    expect(scores.every((s) => s.approvedScore === 1)).toBe(true);

    const evaluation = await harness.context.data.evaluations.findByTestCase(
      ORG_ID,
      caseId,
    );
    expect(evaluation?.humanReviewStatus).toBe('overridden');
    expect(evaluation?.overrideReason).toContain('Analyst disagreed');
  });

  it('requires a documented reason for an N/A dimension', async () => {
    setProviderOverrides({ ai: fakeAI(() => okResponse(4)) });
    const caseId = await capturedCase(harness);
    await evaluateCase(harness.as(analyst), ORG_ID, caseId);

    const review = fullReview(null);
    review.scores = review.scores.map((s) => ({
      ...s,
      notApplicableReason: '',
      overrideReason: 'n/a',
    }));

    const result = await reviewEvaluation(
      harness.as(analyst),
      ORG_ID,
      caseId,
      review,
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('rejects an out-of-range approved score', async () => {
    setProviderOverrides({ ai: fakeAI(() => okResponse(4)) });
    const caseId = await capturedCase(harness);
    await evaluateCase(harness.as(analyst), ORG_ID, caseId);

    const review = fullReview(9, 'reason');
    const result = await reviewEvaluation(
      harness.as(analyst),
      ORG_ID,
      caseId,
      review,
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('does not let a client approve scores', async () => {
    const caseId = await capturedCase(harness);
    const result = await reviewEvaluation(
      harness.as(clientOwner),
      ORG_ID,
      caseId,
      fullReview(4),
    );
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });
});
