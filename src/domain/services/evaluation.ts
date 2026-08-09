import { isFeatureEnabled } from '@/config/feature-flags';
import type { DimensionScoreRecord, Evaluation, TestCase } from '@/data/types';
import {
  DEFAULT_RUBRIC,
  DIMENSIONS,
  type Dimension,
} from '@/domain/scoring/dimensions';
import {
  calculateCaseScore,
  type DimensionScore,
} from '@/domain/scoring/score';
import {
  runDeterministicChecks,
  type CheckCandidate,
} from '@/domain/checks/deterministic';
import type { Confidence } from '@/domain/findings/findings';
import {
  buildEvaluatorPrompt,
  withinInputBudget,
} from '@/domain/evaluation/prompt';
import { validateEvaluatorOutput } from '@/domain/evaluation/schema';
import {
  audit,
  fail,
  ok,
  permit,
  type ServiceContext,
  type ServiceResult,
} from './context';

/**
 * Evaluation pipeline.
 *
 * PRD ref: FR-EVAL-001, in the order the PRD specifies:
 *   1. Deterministic validation
 *   2. Policy-grounded rule checks
 *   3. AI-assisted proposed scoring using structured output
 *   4. Confidence and disagreement checks
 *   5. Mandatory analyst review
 *   6. Final approved scores and findings
 *
 * Steps 1–4 happen here. Step 5 is `reviewEvaluation`, and it is not optional:
 * a case cannot reach `reviewed` without a human acting.
 */

export const MAX_EVALUATOR_RETRIES = 2;

export interface EvaluationOutcome {
  evaluation: Evaluation;
  deterministicCandidates: CheckCandidate[];
  /** True when the case needs a human before anything else can happen. */
  requiresManualReview: boolean;
  manualReviewReason: string | null;
}

/**
 * Run deterministic checks and, if enabled, the AI evaluator for one case.
 *
 * An unconfigured or failing AI provider is NOT an error: PRD 15.6 requires a
 * "provider outage fallback to manual review". The case is routed to an analyst
 * with the deterministic candidates attached.
 */
export async function evaluateCase(
  context: ServiceContext,
  organizationId: string,
  caseId: string,
): Promise<ServiceResult<EvaluationOutcome>> {
  const testCase = await context.data.testCases.findById(
    organizationId,
    caseId,
  );
  if (!testCase) return fail('NOT_FOUND', 'No such test case.');

  const run = await context.data.runs.findById(
    organizationId,
    testCase.testRunId,
  );
  if (!run) return fail('NOT_FOUND', 'No such run.');

  const decision = permit(context, organizationId, 'evaluation.run', {
    projectId: run.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (testCase.state === 'pending') {
    return fail('INVALID_STATE', 'This case has no captured response yet.');
  }

  const turns = await context.data.testCases.listTurns(organizationId, caseId);
  const responseTurns = turns.filter((t) => t.role === 'system');
  const responseText = responseTurns.map((t) => t.originalContent).join('\n\n');

  const planScenario = (
    await context.data.auditPlans.listScenarios(organizationId, run.auditPlanId)
  ).find((s) => s.id === testCase.planScenarioId);

  const template = planScenario?.scenarioTemplateId
    ? await context.data.scenarios.findById(planScenario.scenarioTemplateId)
    : null;

  const rules = template?.evaluationRules ?? {};

  // Step 1 and 2: deterministic and policy-grounded rule checks.
  const deterministicCandidates = runDeterministicChecks({
    responseText,
    expectedLocale: testCase.locale,
    latencyMs: testCase.latencyMs ?? 0,
    ...(rules.requiredDisclosures
      ? { requiredDisclosures: rules.requiredDisclosures }
      : {}),
    ...(rules.forbiddenPhrases
      ? { forbiddenPhrases: rules.forbiddenPhrases }
      : {}),
    ...(rules.escalationRequired !== undefined
      ? { escalationRequired: rules.escalationRequired }
      : {}),
    ...(rules.mustInclude ? { mustInclude: rules.mustInclude } : {}),
    ...(rules.mustNotInclude ? { mustNotInclude: rules.mustNotInclude } : {}),
    ...(testCase.executionError ? { captureError: true } : {}),
  });

  const evaluationVersionId = 'evaluator@1.0.0';
  const now = context.now();

  const aiEnabled = isFeatureEnabled('ai_evaluation');
  const provider = context.providers.ai;

  // Steps 3 and 4, when the evaluator is available.
  let proposedOutput: unknown = null;
  let validationStatus: Evaluation['validationStatus'] = 'manual_review';
  let retryCount = 0;
  let costMinor = 0;
  let latencyMs: number | null = null;
  let manualReviewReason: string | null = null;

  if (!aiEnabled || !provider.isConfigured()) {
    manualReviewReason = aiEnabled
      ? 'The evaluation provider is not configured; this case is queued for manual scoring.'
      : 'AI-assisted evaluation is disabled; this case is queued for manual scoring.';
  } else if (testCase.state === 'unscorable') {
    manualReviewReason =
      'The capture failed, so there is no response to evaluate. An analyst must record the reason.';
  } else {
    const prompt = buildEvaluatorPrompt({
      scenarioObjective: template?.objective ?? 'Not specified.',
      expectedFacts: planScenario?.expectedOutcomes ?? [],
      disallowedOutcomes: rules.mustNotInclude ?? [],
      capturedResponse: responseText,
      conversationContext: turns.map((t) => ({
        role: t.role,
        content: t.originalContent,
      })),
      redactedPolicyExcerpts: [],
      locale: testCase.locale,
      rubricVersion: DEFAULT_RUBRIC.version,
      promptVersion: 'evaluator@1.0.0',
      maxOutputTokens: 2000,
    });

    if (!withinInputBudget(prompt)) {
      manualReviewReason =
        'The captured response exceeds the evaluator input budget and must be scored manually.';
    } else {
      // Bounded retry on malformed output (15.6, mandatory E2E scenario 9).
      for (let attempt = 0; attempt <= MAX_EVALUATOR_RETRIES; attempt += 1) {
        retryCount = attempt;
        const response = await provider.evaluate({
          scenarioObjective: template?.objective ?? 'Not specified.',
          expectedFacts: planScenario?.expectedOutcomes ?? [],
          disallowedOutcomes: rules.mustNotInclude ?? [],
          capturedResponse: responseText,
          conversationContext: turns.map((t) => ({
            role: t.role,
            content: t.originalContent,
          })),
          redactedPolicyExcerpts: [],
          locale: testCase.locale,
          rubricVersion: DEFAULT_RUBRIC.version,
          promptVersion: 'evaluator@1.0.0',
          maxOutputTokens: 2000,
        });

        if (!response.ok) {
          manualReviewReason = `The evaluation provider returned ${response.code}; this case is queued for manual scoring.`;
          break;
        }

        costMinor += response.value.costMinor;
        latencyMs = response.value.latencyMs;

        const validated = validateEvaluatorOutput(response.value.proposal);
        if (validated.valid) {
          proposedOutput = validated.output;
          validationStatus = 'valid';
          manualReviewReason = null;
          break;
        }

        validationStatus = 'invalid';
        manualReviewReason = `The evaluator returned output that failed schema validation ${attempt + 1} time(s); this case is queued for manual scoring.`;
      }
    }
  }

  const evaluation: Evaluation = {
    id: context.newId(),
    organizationId,
    testCaseId: caseId,
    evaluationVersionId,
    proposedOutput,
    validationStatus,
    retryCount,
    costMinor,
    latencyMs,
    // FR-EVAL-001: analyst review is mandatory regardless of what the model did.
    humanReviewStatus: 'required',
    overrideReason: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
  };

  const saved = await context.data.evaluations.create(evaluation);

  // Persist proposed dimension scores so the reviewer sees them side by side
  // with their own. `approvedScore` stays null until a human sets it.
  if (validationStatus === 'valid' && proposedOutput) {
    const output = proposedOutput as {
      scores: Array<{
        dimension: Dimension;
        score: number;
        confidence: Confidence;
        rationale: string;
      }>;
    };
    for (const score of output.scores) {
      const record: DimensionScoreRecord = {
        id: context.newId(),
        organizationId,
        testCaseId: caseId,
        evaluationId: saved.id,
        dimension: score.dimension,
        weight: DEFAULT_RUBRIC.weights[score.dimension],
        proposedScore: score.score,
        approvedScore: null,
        notApplicableReason: null,
        rationale: score.rationale,
        confidence: score.confidence,
        approvedBy: null,
        approvedAt: null,
      };
      await context.data.evaluations.upsertScore(record);
    }
  }

  if (testCase.state === 'captured') {
    await context.data.testCases.update(organizationId, caseId, {
      state: 'evaluated',
    });
  }

  if (costMinor > 0) {
    await context.data.runs.update(organizationId, run.id, {
      aiCostMinor: run.aiCostMinor + costMinor,
    });
  }

  await audit(context, {
    organizationId,
    action: 'case.evaluated',
    objectType: 'test_case',
    objectId: caseId,
    outcome: 'success',
    metadata: {
      validationStatus,
      retryCount,
      deterministicCandidates: deterministicCandidates.length,
    },
  });

  return ok({
    evaluation: saved,
    deterministicCandidates,
    requiresManualReview: true,
    manualReviewReason,
  });
}

export interface ReviewInput {
  scores: Array<{
    dimension: Dimension;
    /** 0–5, or null for a documented N/A. */
    approvedScore: number | null;
    notApplicableReason?: string;
    confidence: Confidence;
    /** Required when the analyst departs from the proposed score. */
    overrideReason?: string;
  }>;
  /** Overall analyst confidence for the case. */
  caseConfidence: Confidence;
}

/**
 * Mandatory analyst review (FR-EVAL-001 step 5, FR-EVAL-003).
 *
 * Overriding an AI proposal requires a reason, and the previous value is
 * preserved: the report shows only human-approved values, but the internal
 * history keeps both.
 */
export async function reviewEvaluation(
  context: ServiceContext,
  organizationId: string,
  caseId: string,
  input: ReviewInput,
): Promise<ServiceResult<{ testCase: TestCase; caseScore: number | null }>> {
  const testCase = await context.data.testCases.findById(
    organizationId,
    caseId,
  );
  if (!testCase) return fail('NOT_FOUND', 'No such test case.');

  const run = await context.data.runs.findById(
    organizationId,
    testCase.testRunId,
  );
  if (!run) return fail('NOT_FOUND', 'No such run.');

  const decision = permit(context, organizationId, 'evaluation.review', {
    projectId: run.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  const existingScores = await context.data.evaluations.listScores(
    organizationId,
    caseId,
  );

  // Every scorable dimension must be reviewed. A partial review would produce a
  // case score computed from an incomplete denominator.
  const reviewed = new Set(input.scores.map((s) => s.dimension));
  const missing = DIMENSIONS.filter((d) => !reviewed.has(d));
  if (missing.length > 0) {
    return fail(
      'VALIDATION_FAILED',
      'Every dimension must be reviewed before the case can be approved.',
      { missing },
    );
  }

  for (const score of input.scores) {
    if (score.approvedScore === null) {
      if (
        !score.notApplicableReason ||
        score.notApplicableReason.trim() === ''
      ) {
        return fail(
          'VALIDATION_FAILED',
          `Dimension ${score.dimension} marked N/A without a documented reason.`,
        );
      }
    } else if (
      !Number.isInteger(score.approvedScore) ||
      score.approvedScore < 0 ||
      score.approvedScore > 5
    ) {
      return fail(
        'VALIDATION_FAILED',
        `Dimension ${score.dimension} score is outside the 0–5 scale.`,
      );
    }

    const existing = existingScores.find(
      (s) => s.dimension === score.dimension,
    );
    const proposed = existing?.proposedScore ?? null;
    const departsFromProposal =
      proposed !== null && proposed !== score.approvedScore;

    // FR-EVAL-003: an override requires a reason.
    if (departsFromProposal && (score.overrideReason ?? '').trim() === '') {
      return fail(
        'VALIDATION_FAILED',
        `Changing the proposed score for ${score.dimension} requires a reason.`,
      );
    }
  }

  const now = context.now();

  for (const score of input.scores) {
    const existing = existingScores.find(
      (s) => s.dimension === score.dimension,
    );
    const record: DimensionScoreRecord = {
      id: existing?.id ?? context.newId(),
      organizationId,
      testCaseId: caseId,
      evaluationId: existing?.evaluationId ?? null,
      dimension: score.dimension,
      weight: DEFAULT_RUBRIC.weights[score.dimension],
      // The proposal is preserved alongside the approved value.
      proposedScore: existing?.proposedScore ?? null,
      approvedScore: score.approvedScore,
      notApplicableReason: score.notApplicableReason ?? null,
      rationale: score.overrideReason ?? existing?.rationale ?? null,
      confidence: score.confidence,
      approvedBy: context.actor.userId,
      approvedAt: now,
    };
    await context.data.evaluations.upsertScore(record);
  }

  const dimensionScores: DimensionScore[] = input.scores.map((s) => ({
    dimension: s.dimension,
    score: s.approvedScore as DimensionScore['score'],
    ...(s.notApplicableReason
      ? { notApplicableReason: s.notApplicableReason }
      : {}),
  }));

  const planScenario = (
    await context.data.auditPlans.listScenarios(organizationId, run.auditPlanId)
  ).find((s) => s.id === testCase.planScenarioId);

  const caseScore = calculateCaseScore({
    caseId,
    locale: testCase.locale,
    riskWeight: planScenario?.riskWeight ?? 1,
    scores: dimensionScores,
  });

  const evaluation = await context.data.evaluations.findByTestCase(
    organizationId,
    caseId,
  );
  if (evaluation) {
    const anyOverride = input.scores.some(
      (s) => (s.overrideReason ?? '').trim() !== '',
    );
    await context.data.evaluations.update(organizationId, evaluation.id, {
      humanReviewStatus: anyOverride ? 'overridden' : 'approved',
      reviewedBy: context.actor.userId,
      reviewedAt: now,
      ...(anyOverride
        ? {
            overrideReason: input.scores
              .filter((s) => (s.overrideReason ?? '').trim() !== '')
              .map((s) => `${s.dimension}: ${s.overrideReason}`)
              .join('; '),
          }
        : {}),
    });
  }

  const updated = await context.data.testCases.update(organizationId, caseId, {
    state: 'reviewed',
    approvedScore: caseScore,
    approvedConfidence: input.caseConfidence,
    reviewedBy: context.actor.userId,
    reviewedAt: now,
  });

  await audit(context, {
    organizationId,
    action: 'case.reviewed',
    objectType: 'test_case',
    objectId: caseId,
    outcome: 'success',
    metadata: { caseScore: caseScore ?? -1 },
  });

  return ok({ testCase: updated, caseScore });
}
