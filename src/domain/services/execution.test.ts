import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  captureResponse,
  contentChecksum,
  createRun,
  runProgress,
  transitionRun,
} from './execution';
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

let harness: Harness;
const analyst = makeActor('analyst');
const owner = makeActor('platform_owner');
const clientOwner = makeActor('client_owner');

async function seedReadyProject(h: Harness, count = 2): Promise<void> {
  await seedProject(h, { onboardingAccepted: true, status: 'planning' });
  await seedAuthorization(h);
  await seedApprovedPlan(h, { count, locales: ['en-CA'] });
}

/** Create a run and move it to `running` so captures are permitted. */
async function startedRun(h: Harness) {
  const created = await createRun(h.as(analyst), ORG_ID, PROJECT_ID);
  if (!created.ok) throw new Error('run creation failed');
  await transitionRun(h.as(owner), ORG_ID, created.value.run.id, 'approved');
  await transitionRun(h.as(analyst), ORG_ID, created.value.run.id, 'queued');
  await transitionRun(h.as(analyst), ORG_ID, created.value.run.id, 'running');
  return created.value;
}

beforeEach(async () => {
  harness = createHarness();
  await seedReadyProject(harness);
});

afterEach(() => {
  delete process.env.EXECUTION_KILL_SWITCH;
});

describe('contentChecksum', () => {
  it('is stable and differs for different content', () => {
    expect(contentChecksum('hello')).toBe(contentChecksum('hello'));
    expect(contentChecksum('hello')).not.toBe(contentChecksum('hello '));
    expect(contentChecksum('hello')).toHaveLength(64);
  });
});

describe('createRun', () => {
  it('creates one pending case per plan scenario', async () => {
    const result = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cases).toHaveLength(2);
    expect(result.value.cases.every((c) => c.state === 'pending')).toBe(true);
    expect(result.value.run.state).toBe('draft');
  });

  it('refuses without an active authorization', async () => {
    // 16.9: no testing without current authorization.
    harness = createHarness();
    await seedProject(harness, { onboardingAccepted: true });
    await seedApprovedPlan(harness, { count: 1 });

    const result = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    expect(result).toMatchObject({
      ok: false,
      code: 'AUTHORIZATION_NOT_ACTIVE',
    });
  });

  it('refuses without an approved plan', async () => {
    harness = createHarness();
    await seedProject(harness, { onboardingAccepted: true });
    await seedAuthorization(harness);

    const result = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_STATE' });
  });

  it('creates a retest limited to the requested scenarios', async () => {
    const scenarios = await harness.context.data.auditPlans.listScenarios(
      ORG_ID,
      `plan_${PROJECT_ID}`,
    );
    const first = scenarios[0];
    expect(first).toBeDefined();
    if (!first) return;

    const result = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID, {
      runType: 'retest',
      planScenarioIds: [first.id],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.run.runType).toBe('retest');
    expect(result.value.cases).toHaveLength(1);
  });

  it('denies a client', async () => {
    const result = await createRun(harness.as(clientOwner), ORG_ID, PROJECT_ID);
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });
});

describe('transitionRun', () => {
  it('walks the documented happy path', async () => {
    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) return;
    const runId = created.value.run.id;

    expect(
      (await transitionRun(harness.as(owner), ORG_ID, runId, 'approved')).ok,
    ).toBe(true);
    expect(
      (await transitionRun(harness.as(analyst), ORG_ID, runId, 'queued')).ok,
    ).toBe(true);
    expect(
      (await transitionRun(harness.as(analyst), ORG_ID, runId, 'running')).ok,
    ).toBe(true);

    const run = await harness.context.data.runs.findById(ORG_ID, runId);
    expect(run?.state).toBe('running');
    expect(run?.startedAt).not.toBeNull();
  });

  it('rejects an invalid transition', async () => {
    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) return;
    const result = await transitionRun(
      harness.as(owner),
      ORG_ID,
      created.value.run.id,
      'released',
    );
    expect(result).toMatchObject({ ok: false, code: 'INVALID_STATE' });
  });

  it('requires a reason to pause', async () => {
    const { run } = await startedRun(harness);
    const noReason = await transitionRun(
      harness.as(analyst),
      ORG_ID,
      run.id,
      'paused',
    );
    expect(noReason).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });

    const withReason = await transitionRun(
      harness.as(analyst),
      ORG_ID,
      run.id,
      'paused',
      'Customer reported elevated load.',
    );
    expect(withReason.ok).toBe(true);
  });

  it('blocks execution when the kill switch is engaged', async () => {
    // FR-RUN-004 and mandatory E2E scenario 15.
    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) return;
    await transitionRun(
      harness.as(owner),
      ORG_ID,
      created.value.run.id,
      'approved',
    );

    process.env.EXECUTION_KILL_SWITCH = 'true';

    const result = await transitionRun(
      harness.as(analyst),
      ORG_ID,
      created.value.run.id,
      'queued',
    );
    expect(result).toMatchObject({ ok: false, code: 'EXECUTION_DISABLED' });
  });

  it('re-checks authorization at the moment execution starts', async () => {
    // An attestation revoked between run creation and start must stop it.
    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) return;
    await transitionRun(
      harness.as(owner),
      ORG_ID,
      created.value.run.id,
      'approved',
    );

    await harness.context.data.authorizations.revoke(
      `attestation_${PROJECT_ID}`,
      harness.context.now(),
      'Customer withdrew authorization.',
    );

    const result = await transitionRun(
      harness.as(analyst),
      ORG_ID,
      created.value.run.id,
      'queued',
    );
    expect(result).toMatchObject({
      ok: false,
      code: 'AUTHORIZATION_NOT_ACTIVE',
    });
  });

  it('records a denial audit event when a transition is refused', async () => {
    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) return;
    await transitionRun(
      harness.as(owner),
      ORG_ID,
      created.value.run.id,
      'released',
    );

    const events = await harness.context.data.auditEvents.list({ limit: 20 });
    expect(
      events.some(
        (e) => e.action === 'run.transition_denied' && e.outcome === 'denied',
      ),
    ).toBe(true);
  });
});

describe('captureResponse', () => {
  it('stores turns with checksums and marks the case captured', async () => {
    const { cases } = await startedRun(harness);
    const target = cases[0];
    expect(target).toBeDefined();
    if (!target) return;

    const result = await captureResponse(
      harness.as(analyst),
      ORG_ID,
      target.id,
      {
        turns: [
          { role: 'tester', content: 'How long do I have to get a refund?' },
          { role: 'system', content: 'You have thirty days from delivery.' },
        ],
        latencyMs: 850,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.testCase.state).toBe('captured');
    expect(result.value.turns).toHaveLength(2);
    expect(result.value.turns[0]?.checksum).toBe(
      contentChecksum('How long do I have to get a refund?'),
    );
  });

  it('refuses to overwrite captured evidence', async () => {
    // FR-RUN-005: "Never modify the original response text after capture."
    const { cases } = await startedRun(harness);
    const target = cases[0];
    if (!target) return;

    const first = await captureResponse(
      harness.as(analyst),
      ORG_ID,
      target.id,
      {
        turns: [
          { role: 'tester', content: 'Question' },
          { role: 'system', content: 'Original answer' },
        ],
        latencyMs: 100,
      },
    );
    expect(first.ok).toBe(true);

    const second = await captureResponse(
      harness.as(analyst),
      ORG_ID,
      target.id,
      {
        turns: [
          { role: 'tester', content: 'Question' },
          { role: 'system', content: 'Different answer' },
        ],
        latencyMs: 100,
      },
    );
    expect(second).toMatchObject({ ok: false, code: 'IMMUTABLE' });

    const turns = await harness.context.data.testCases.listTurns(
      ORG_ID,
      target.id,
    );
    expect(turns[1]?.originalContent).toBe('Original answer');
  });

  it('refuses capture unless the run is running', async () => {
    const created = await createRun(harness.as(analyst), ORG_ID, PROJECT_ID);
    if (!created.ok) return;
    const target = created.value.cases[0];
    if (!target) return;

    const result = await captureResponse(
      harness.as(analyst),
      ORG_ID,
      target.id,
      {
        turns: [{ role: 'system', content: 'Answer' }],
        latencyMs: 10,
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'INVALID_STATE' });
  });

  it('stops capture when authorization is revoked mid-run', async () => {
    const { cases } = await startedRun(harness);
    const target = cases[0];
    if (!target) return;

    await harness.context.data.authorizations.revoke(
      `attestation_${PROJECT_ID}`,
      harness.context.now(),
      'Stop condition triggered.',
    );

    const result = await captureResponse(
      harness.as(analyst),
      ORG_ID,
      target.id,
      {
        turns: [{ role: 'system', content: 'Answer' }],
        latencyMs: 10,
      },
    );
    expect(result).toMatchObject({
      ok: false,
      code: 'AUTHORIZATION_NOT_ACTIVE',
    });
  });

  it('requires at least one system response', async () => {
    const { cases } = await startedRun(harness);
    const target = cases[0];
    if (!target) return;

    const result = await captureResponse(
      harness.as(analyst),
      ORG_ID,
      target.id,
      {
        turns: [{ role: 'tester', content: 'Only my question' }],
        latencyMs: 10,
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('records a capture error as unscorable rather than a bad score', async () => {
    // A timeout is missing information, not evidence of a bad answer (10.6).
    const { cases } = await startedRun(harness);
    const target = cases[0];
    if (!target) return;

    const result = await captureResponse(
      harness.as(analyst),
      ORG_ID,
      target.id,
      {
        turns: [],
        latencyMs: 30_000,
        executionError: 'Gateway timeout after 30s.',
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.testCase.state).toBe('unscorable');
    expect(result.value.testCase.approvedScore).toBeNull();
  });

  it('denies a client capturing a response', async () => {
    const { cases } = await startedRun(harness);
    const target = cases[0];
    if (!target) return;

    const result = await captureResponse(
      harness.as(clientOwner),
      ORG_ID,
      target.id,
      { turns: [{ role: 'system', content: 'x' }], latencyMs: 10 },
    );
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });
});

describe('runProgress', () => {
  it('reports capture completion', async () => {
    const { run, cases } = await startedRun(harness);

    const before = await runProgress(harness.as(analyst), ORG_ID, run.id);
    if (!before.ok) return;
    expect(before.value.pending).toBe(2);
    expect(before.value.captureComplete).toBe(false);

    for (const testCase of cases) {
      await captureResponse(harness.as(analyst), ORG_ID, testCase.id, {
        turns: [
          { role: 'tester', content: 'Q' },
          { role: 'system', content: 'A' },
        ],
        latencyMs: 100,
      });
    }

    const after = await runProgress(harness.as(analyst), ORG_ID, run.id);
    if (!after.ok) return;
    expect(after.value.captured).toBe(2);
    expect(after.value.pending).toBe(0);
    expect(after.value.captureComplete).toBe(true);
  });
});
