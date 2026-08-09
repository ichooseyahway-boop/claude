import { describe, expect, it } from 'vitest';
import {
  RUN_STATES,
  allowedTransitions,
  canTransition,
  evaluateReleaseGate,
  isRunState,
  type ReleaseGateInput,
  type RunState,
} from './state-machine';

describe('run states', () => {
  it('exposes exactly the states in the PRD', () => {
    expect([...RUN_STATES]).toEqual([
      'draft',
      'approved',
      'queued',
      'running',
      'review_required',
      'report_draft',
      'released',
      'paused',
      'failed',
      'cancelled',
      'superseded',
    ]);
    expect(isRunState('running')).toBe(true);
    expect(isRunState('finished')).toBe(false);
  });
});

describe('canTransition', () => {
  it('allows the documented happy path', () => {
    const path: Array<[RunState, RunState]> = [
      ['draft', 'approved'],
      ['approved', 'queued'],
      ['queued', 'running'],
      ['running', 'review_required'],
      ['review_required', 'report_draft'],
      ['report_draft', 'released'],
    ];
    for (const [from, to] of path) {
      expect(
        canTransition({ from, to, role: 'platform_owner' }).allowed,
        `${from} -> ${to}`,
      ).toBe(true);
    }
  });

  it('rejects skipping straight from draft to released', () => {
    const result = canTransition({
      from: 'draft',
      to: 'released',
      role: 'platform_owner',
    });
    expect(result.allowed).toBe(false);
    expect(result).toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('treats a released run as immutable except for supersede', () => {
    // FR-RPT-004: "Released reports are immutable."
    for (const to of RUN_STATES) {
      const result = canTransition({
        from: 'released',
        to,
        role: 'platform_owner',
        reason: 'Correction issued as version 2.',
      });
      expect(result.allowed, `released -> ${to}`).toBe(to === 'superseded');
    }
  });

  it('treats cancelled and superseded as terminal', () => {
    for (const from of ['cancelled', 'superseded'] as const) {
      expect(allowedTransitions(from, 'platform_owner')).toEqual([]);
    }
  });

  it('does not let a plain analyst approve a plan or release a report', () => {
    expect(
      canTransition({ from: 'draft', to: 'approved', role: 'analyst' }),
    ).toMatchObject({ allowed: false, code: 'ROLE_NOT_PERMITTED' });

    expect(
      canTransition({ from: 'report_draft', to: 'released', role: 'analyst' }),
    ).toMatchObject({ allowed: false, code: 'ROLE_NOT_PERMITTED' });
  });

  it('lets a senior analyst approve and release', () => {
    expect(
      canTransition({ from: 'draft', to: 'approved', role: 'senior_analyst' })
        .allowed,
    ).toBe(true);
    expect(
      canTransition({
        from: 'report_draft',
        to: 'released',
        role: 'senior_analyst',
      }).allowed,
    ).toBe(true);
  });

  it('requires a recorded reason for exceptional transitions', () => {
    expect(
      canTransition({ from: 'running', to: 'paused', role: 'analyst' }),
    ).toMatchObject({ allowed: false, code: 'REASON_REQUIRED' });

    expect(
      canTransition({
        from: 'running',
        to: 'paused',
        role: 'analyst',
        reason: 'Customer reported elevated load.',
      }).allowed,
    ).toBe(true);

    expect(
      canTransition({
        from: 'running',
        to: 'paused',
        role: 'analyst',
        reason: '   ',
      }),
    ).toMatchObject({ allowed: false, code: 'REASON_REQUIRED' });
  });

  it('blocks new outbound execution when the kill switch is engaged', () => {
    // FR-RUN-004: the kill switch stops execution without disabling report
    // access or billing administration.
    for (const to of ['queued', 'running'] as const) {
      expect(
        canTransition({
          from: to === 'queued' ? 'approved' : 'queued',
          to,
          role: 'platform_owner',
          executionKillSwitchEngaged: true,
        }),
      ).toMatchObject({ allowed: false, code: 'EXECUTION_DISABLED' });
    }
  });

  it('still allows review, reporting and release while the kill switch is engaged', () => {
    const allowedUnderKillSwitch: Array<[RunState, RunState]> = [
      ['running', 'review_required'],
      ['review_required', 'report_draft'],
      ['report_draft', 'released'],
    ];
    for (const [from, to] of allowedUnderKillSwitch) {
      expect(
        canTransition({
          from,
          to,
          role: 'platform_owner',
          executionKillSwitchEngaged: true,
        }).allowed,
        `${from} -> ${to}`,
      ).toBe(true);
    }
  });

  it('lists the transitions available to a role', () => {
    expect(allowedTransitions('draft', 'analyst').sort()).toEqual([
      'cancelled',
    ]);
    expect(allowedTransitions('draft', 'senior_analyst').sort()).toEqual([
      'approved',
    ]);
  });
});

describe('evaluateReleaseGate', () => {
  const passing: ReleaseGateInput = {
    runState: 'report_draft',
    allRequiredScenariosReviewed: true,
    allCriticalHighAdjudicated: true,
    scopeAndLimitationsComplete: true,
    previewGenerated: true,
    noInternalNotesVisible: true,
    noSecretsOrRestrictedData: true,
    reviewerUserId: 'user_owner',
    reviewerRole: 'platform_owner',
    authorizationActiveForAllTests: true,
  };

  it('allows release when every condition holds', () => {
    expect(evaluateReleaseGate(passing)).toEqual({
      canRelease: true,
      blockers: [],
    });
  });

  it('blocks release when a high finding is unreviewed', () => {
    // Mandatory E2E scenario 11: "Report release fails when unreviewed high
    // finding exists."
    const result = evaluateReleaseGate({
      ...passing,
      allCriticalHighAdjudicated: false,
    });
    expect(result.canRelease).toBe(false);
    expect(result.blockers).toContain('CRITICAL_HIGH_NOT_ADJUDICATED');
  });

  it('blocks release when internal notes or secrets would be exposed', () => {
    expect(
      evaluateReleaseGate({ ...passing, noInternalNotesVisible: false })
        .blockers,
    ).toContain('INTERNAL_NOTES_VISIBLE');

    expect(
      evaluateReleaseGate({ ...passing, noSecretsOrRestrictedData: false })
        .blockers,
    ).toContain('SECRETS_OR_RESTRICTED_DATA_PRESENT');
  });

  it('blocks release without an authorized named reviewer', () => {
    expect(
      evaluateReleaseGate({ ...passing, reviewerUserId: null }).blockers,
    ).toContain('REVIEWER_NOT_AUTHORIZED');

    expect(
      evaluateReleaseGate({ ...passing, reviewerRole: 'analyst' }).blockers,
    ).toContain('REVIEWER_NOT_AUTHORIZED');
  });

  it('blocks release when authorization was not active for every test', () => {
    expect(
      evaluateReleaseGate({
        ...passing,
        authorizationActiveForAllTests: false,
      }).blockers,
    ).toContain('AUTHORIZATION_NOT_ACTIVE');
  });

  it('blocks release from any state other than report_draft', () => {
    expect(
      evaluateReleaseGate({ ...passing, runState: 'running' }).blockers,
    ).toContain('RUN_NOT_IN_REPORT_DRAFT');
  });

  it('reports every blocker at once rather than the first', () => {
    const result = evaluateReleaseGate({
      runState: 'draft',
      allRequiredScenariosReviewed: false,
      allCriticalHighAdjudicated: false,
      scopeAndLimitationsComplete: false,
      previewGenerated: false,
      noInternalNotesVisible: false,
      noSecretsOrRestrictedData: false,
      reviewerUserId: null,
      reviewerRole: null,
      authorizationActiveForAllTests: false,
    });
    expect(result.canRelease).toBe(false);
    expect(result.blockers).toHaveLength(9);
  });
});
