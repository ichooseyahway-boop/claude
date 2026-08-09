import { createHash } from 'node:crypto';
import { isExecutionKillSwitchEngaged } from '@/config/feature-flags';
import type {
  CaptureMode,
  ConversationTurn,
  TestCase,
  TestRun,
} from '@/data/types';
import { canTransition, type RunState } from '@/domain/runs/state-machine';
import type { ActorRole } from '@/domain/runs/state-machine';
import {
  audit,
  fail,
  ok,
  permit,
  type ServiceContext,
  type ServiceResult,
} from './context';

/**
 * Run creation, state transitions and response capture.
 *
 * PRD refs: FR-RUN-001..005, section 8.3 steps 3–4.
 *
 * Two invariants dominate this file:
 *   1. Nothing executes without an ACTIVE authorization attestation (16.9).
 *   2. Captured content is immutable. A correction is an annotation, never an
 *      edit (FR-RUN-005).
 */

/** SHA-256 of the captured text, stored with every turn (FR-RUN-002). */
export function contentChecksum(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function runRoleFor(role: string): ActorRole {
  switch (role) {
    case 'platform_owner':
      return 'platform_owner';
    case 'senior_analyst':
      return 'senior_analyst';
    case 'analyst':
      return 'analyst';
    default:
      return 'system';
  }
}

/**
 * Create a run from the project's approved plan.
 *
 * One test case is created per plan scenario up front, so the operations queue
 * shows real progress ("18 of 75 captured") rather than an opaque spinner.
 */
export async function createRun(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
  options: {
    runType?: TestRun['runType'];
    captureMode?: CaptureMode;
    baselineRunId?: string;
    /** For a retest: only these plan scenarios are re-run. */
    planScenarioIds?: string[];
  } = {},
): Promise<ServiceResult<{ run: TestRun; cases: TestCase[] }>> {
  const decision = permit(context, organizationId, 'run.create', {
    projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const project = await context.data.projects.findById(
    organizationId,
    projectId,
  );
  if (!project) return fail('NOT_FOUND', 'No such project.');

  // 16.9: testing requires current authorization, checked at creation and
  // again at start.
  const attestation = await context.data.authorizations.findActive(
    organizationId,
    projectId,
    context.now(),
  );
  if (!attestation) {
    return fail(
      'AUTHORIZATION_NOT_ACTIVE',
      'A current authorization attestation is required before a run can be created.',
    );
  }

  const plans = await context.data.auditPlans.listForProject(
    organizationId,
    projectId,
  );
  const approvedPlan = plans.find((p) => p.status === 'approved');
  if (!approvedPlan) {
    return fail('INVALID_STATE', 'This project has no approved audit plan.');
  }

  let scenarios = await context.data.auditPlans.listScenarios(
    organizationId,
    approvedPlan.id,
  );

  if (options.planScenarioIds && options.planScenarioIds.length > 0) {
    const wanted = new Set(options.planScenarioIds);
    scenarios = scenarios.filter((s) => wanted.has(s.id));
    if (scenarios.length === 0) {
      return fail(
        'VALIDATION_FAILED',
        'None of the requested scenarios belong to the approved plan.',
      );
    }
  }

  const run: TestRun = {
    id: context.newId(),
    organizationId,
    projectId,
    auditPlanId: approvedPlan.id,
    runType: options.runType ?? 'initial',
    state: 'draft',
    baselineRunId: options.baselineRunId ?? null,
    startedAt: null,
    completedAt: null,
    releasedAt: null,
    rubricVersion: 'default@1.0.0',
    evaluatorVersion: null,
    aiCostMinor: 0,
    analystMinutes: 0,
    createdAt: context.now(),
  };

  const savedRun = await context.data.runs.create(run);

  const cases: TestCase[] = [];
  for (const scenario of scenarios) {
    const testCase: TestCase = {
      id: context.newId(),
      organizationId,
      testRunId: savedRun.id,
      planScenarioId: scenario.id,
      locale: scenario.locale,
      state: 'pending',
      captureMode: options.captureMode ?? 'manual',
      startedAt: null,
      completedAt: null,
      latencyMs: null,
      executionError: null,
      approvedScore: null,
      approvedConfidence: null,
      reviewedBy: null,
      reviewedAt: null,
    };
    cases.push(await context.data.testCases.create(testCase));
  }

  await audit(context, {
    organizationId,
    action: 'run.created',
    objectType: 'test_run',
    objectId: savedRun.id,
    outcome: 'success',
    metadata: { runType: savedRun.runType, cases: cases.length },
  });

  return ok({ run: savedRun, cases });
}

/**
 * Move a run between states.
 *
 * Delegates the rules to the pure state machine and adds the two things that
 * need I/O: the kill switch and re-checking authorization before execution.
 */
export async function transitionRun(
  context: ServiceContext,
  organizationId: string,
  runId: string,
  to: RunState,
  reason?: string,
): Promise<ServiceResult<TestRun>> {
  const run = await context.data.runs.findById(organizationId, runId);
  if (!run) return fail('NOT_FOUND', 'No such run.');

  const permission =
    to === 'queued' || to === 'running'
      ? 'run.start'
      : to === 'paused'
        ? 'run.pause'
        : to === 'cancelled'
          ? 'run.cancel'
          : 'run.start';

  const decision = permit(context, organizationId, permission, {
    projectId: run.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const transition = canTransition({
    from: run.state,
    to,
    role: runRoleFor(decision.role),
    ...(reason !== undefined ? { reason } : {}),
    executionKillSwitchEngaged: isExecutionKillSwitchEngaged(),
  });

  if (!transition.allowed) {
    const code =
      transition.code === 'EXECUTION_DISABLED'
        ? 'EXECUTION_DISABLED'
        : transition.code === 'REASON_REQUIRED'
          ? 'VALIDATION_FAILED'
          : transition.code === 'ROLE_NOT_PERMITTED'
            ? 'ROLE_NOT_PERMITTED'
            : 'INVALID_STATE';
    await audit(context, {
      organizationId,
      action: 'run.transition_denied',
      objectType: 'test_run',
      objectId: runId,
      outcome: 'denied',
      metadata: { from: run.state, to, code: transition.code },
    });
    return fail(code, transition.message);
  }

  // Re-check authorization at the moment execution starts, not just at
  // creation: an attestation can be revoked in between (16.9).
  if (to === 'queued' || to === 'running') {
    const attestation = await context.data.authorizations.findActive(
      organizationId,
      run.projectId,
      context.now(),
    );
    if (!attestation) {
      return fail(
        'AUTHORIZATION_NOT_ACTIVE',
        'Authorization is not active. Testing cannot start or resume.',
      );
    }
  }

  const patch: Partial<TestRun> = { state: to };
  if (to === 'running' && run.startedAt === null) {
    patch.startedAt = context.now();
  }
  if (to === 'review_required') {
    patch.completedAt = context.now();
  }
  if (to === 'released') {
    patch.releasedAt = context.now();
  }

  const updated = await context.data.runs.update(organizationId, runId, patch);

  await audit(context, {
    organizationId,
    action: 'run.transitioned',
    objectType: 'test_run',
    objectId: runId,
    outcome: 'success',
    riskLevel: to === 'released' ? 'medium' : 'low',
    metadata: { from: run.state, to },
  });

  return ok(updated);
}

export interface CaptureInput {
  /** Prompt turns exactly as sent, then response turns exactly as received. */
  turns: Array<{ role: 'tester' | 'system'; content: string }>;
  latencyMs: number;
  captureMode?: CaptureMode;
  /** Set when the capture failed; the case becomes unscorable. */
  executionError?: string;
}

/**
 * Record a captured exchange for a test case (FR-RUN-002, FR-RUN-005).
 *
 * Content is written once. A second capture attempt on a case that already has
 * turns is refused rather than merged — re-running a scenario creates a new
 * case in a new run, which is what keeps retest evidence separate from the
 * original (8.4).
 */
export async function captureResponse(
  context: ServiceContext,
  organizationId: string,
  caseId: string,
  input: CaptureInput,
): Promise<ServiceResult<{ testCase: TestCase; turns: ConversationTurn[] }>> {
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

  const decision = permit(context, organizationId, 'run.capture', {
    projectId: run.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (run.state !== 'running') {
    return fail(
      'INVALID_STATE',
      'Responses can only be captured while the run is running.',
    );
  }

  const attestation = await context.data.authorizations.findActive(
    organizationId,
    run.projectId,
    context.now(),
  );
  if (!attestation) {
    return fail(
      'AUTHORIZATION_NOT_ACTIVE',
      'Authorization is not active. Capture must stop.',
    );
  }

  const existingTurns = await context.data.testCases.listTurns(
    organizationId,
    caseId,
  );
  if (existingTurns.length > 0) {
    return fail(
      'IMMUTABLE',
      'This case already has captured evidence. Create a retest run instead of overwriting it.',
    );
  }

  if (input.executionError) {
    const updated = await context.data.testCases.update(
      organizationId,
      caseId,
      {
        state: 'unscorable',
        executionError: input.executionError,
        startedAt: testCase.startedAt ?? context.now(),
        completedAt: context.now(),
        latencyMs: input.latencyMs,
      },
    );
    await audit(context, {
      organizationId,
      action: 'case.capture_failed',
      objectType: 'test_case',
      objectId: caseId,
      outcome: 'error',
      metadata: { runId: run.id },
    });
    return ok({ testCase: updated, turns: [] });
  }

  if (input.turns.length === 0) {
    return fail('VALIDATION_FAILED', 'At least one turn is required.');
  }
  if (!input.turns.some((t) => t.role === 'system')) {
    return fail(
      'VALIDATION_FAILED',
      'A capture must include at least one system response.',
    );
  }

  const now = context.now();
  const turns: ConversationTurn[] = [];
  let sequence = 0;

  for (const turn of input.turns) {
    sequence += 1;
    const record: ConversationTurn = {
      id: context.newId(),
      organizationId,
      testCaseId: caseId,
      sequence,
      role: turn.role,
      originalContent: turn.content,
      checksum: contentChecksum(turn.content),
      characterCount: turn.content.length,
      capturedAt: now,
    };
    turns.push(await context.data.testCases.appendTurn(record));
  }

  const updated = await context.data.testCases.update(organizationId, caseId, {
    state: 'captured',
    captureMode: input.captureMode ?? testCase.captureMode,
    startedAt: testCase.startedAt ?? now,
    completedAt: now,
    latencyMs: input.latencyMs,
  });

  await audit(context, {
    organizationId,
    action: 'case.captured',
    objectType: 'test_case',
    objectId: caseId,
    outcome: 'success',
    metadata: {
      runId: run.id,
      turns: turns.length,
      captureMode: updated.captureMode,
    },
  });

  return ok({ testCase: updated, turns });
}

export interface RunProgress {
  total: number;
  pending: number;
  captured: number;
  evaluated: number;
  reviewed: number;
  unscorable: number;
  /** True when every case has reached a terminal capture state. */
  captureComplete: boolean;
}

export async function runProgress(
  context: ServiceContext,
  organizationId: string,
  runId: string,
): Promise<ServiceResult<RunProgress>> {
  const run = await context.data.runs.findById(organizationId, runId);
  if (!run) return fail('NOT_FOUND', 'No such run.');

  const decision = permit(context, organizationId, 'project.read', {
    projectId: run.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const cases = await context.data.testCases.listForRun(organizationId, runId);
  const count = (state: TestCase['state']) =>
    cases.filter((c) => c.state === state).length;

  const pending = count('pending');

  return ok({
    total: cases.length,
    pending,
    captured: count('captured'),
    evaluated: count('evaluated'),
    reviewed: count('reviewed'),
    unscorable: count('unscorable'),
    captureComplete: cases.length > 0 && pending === 0,
  });
}
