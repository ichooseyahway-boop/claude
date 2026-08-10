import { describe, expect, it } from 'vitest';

import {
  allowedTransitionsFrom,
  assertTransition,
  evaluateTransition,
  isTransitionAllowed,
  RUN_STATES,
  RunTransitionError,
  TERMINAL_STATES,
  type RunState,
} from './state-machine';

/** Context that satisfies every safety gate, so tests can vary one at a time. */
const permissive = {
  executionKillSwitchEnabled: false,
  authorizationActive: true,
  releaseChecklistSatisfied: true,
};

describe('run state machine graph (FR-RUN-001)', () => {
  it('walks the documented happy path', () => {
    const path: RunState[] = [
      'draft',
      'approved',
      'queued',
      'running',
      'review_required',
      'report_draft',
      'released',
    ];

    for (let index = 0; index < path.length - 1; index += 1) {
      const from = path[index] as RunState;
      const to = path[index + 1] as RunState;
      expect(evaluateTransition(from, to, permissive).allowed).toBe(true);
    }
  });

  it('rejects skipping straight from draft to released', () => {
    const decision = evaluateTransition('draft', 'released', permissive);
    expect(decision.allowed).toBe(false);
    expect(decision.refusal).toBe('invalid_transition');
  });

  it('treats cancelled and superseded as terminal', () => {
    for (const state of TERMINAL_STATES) {
      expect(allowedTransitionsFrom(state)).toHaveLength(0);

      for (const target of RUN_STATES) {
        const decision = evaluateTransition(state, target, permissive);
        expect(decision.allowed).toBe(false);
        expect(decision.refusal).toBe('terminal_state');
      }
    }
  });

  it('allows a released run only to be superseded (FR-RPT-004)', () => {
    expect(allowedTransitionsFrom('released')).toEqual(['superseded']);
    // Reopening a released run would break report immutability.
    expect(isTransitionAllowed('released', 'report_draft')).toBe(false);
    expect(isTransitionAllowed('released', 'running')).toBe(false);
  });

  it('allows pausing from every executing or reviewing state', () => {
    for (const state of ['queued', 'running', 'review_required', 'report_draft'] as RunState[]) {
      expect(isTransitionAllowed(state, 'paused')).toBe(true);
    }
  });

  it('allows resuming a paused run and retrying a failed one', () => {
    expect(evaluateTransition('paused', 'running', permissive).allowed).toBe(true);
    expect(evaluateTransition('failed', 'queued', permissive).allowed).toBe(true);
  });
});

describe('execution kill switch (FR-RUN-004)', () => {
  it('blocks entry into queued and running', () => {
    for (const target of ['queued', 'running'] as RunState[]) {
      const from: RunState = target === 'queued' ? 'approved' : 'queued';
      const decision = evaluateTransition(from, target, {
        ...permissive,
        executionKillSwitchEnabled: true,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.refusal).toBe('execution_kill_switch_enabled');
    }
  });

  it('does not block review, reporting or release', () => {
    // The switch stops outbound execution. It must not lock customers out of
    // reports that already exist.
    const context = { ...permissive, executionKillSwitchEnabled: true };

    expect(evaluateTransition('running', 'review_required', context).allowed).toBe(true);
    expect(evaluateTransition('review_required', 'report_draft', context).allowed).toBe(true);
    expect(evaluateTransition('report_draft', 'released', context).allowed).toBe(true);
  });
});

describe('authorization gate (PRD 16.9)', () => {
  it('blocks execution when authorization is inactive', () => {
    const decision = evaluateTransition('approved', 'queued', {
      ...permissive,
      authorizationActive: false,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.refusal).toBe('authorization_not_active');
  });

  it('fails closed when the caller omits authorization context', () => {
    // A caller that forgets to pass context must not be able to start a test.
    const decision = evaluateTransition('approved', 'queued', {});
    expect(decision.allowed).toBe(false);
    expect(decision.refusal).toBe('authorization_not_active');
  });
});

describe('release gate (FR-RPT-003)', () => {
  it('blocks release when the checklist is incomplete', () => {
    const decision = evaluateTransition('report_draft', 'released', {
      ...permissive,
      releaseChecklistSatisfied: false,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.refusal).toBe('release_checklist_incomplete');
  });

  it('fails closed when the caller omits checklist context', () => {
    const decision = evaluateTransition('report_draft', 'released', {});
    expect(decision.allowed).toBe(false);
    expect(decision.refusal).toBe('release_checklist_incomplete');
  });
});

describe('assertTransition', () => {
  it('throws a typed error carrying the refusal reason', () => {
    try {
      assertTransition('draft', 'released', permissive);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RunTransitionError);
      expect((error as RunTransitionError).refusal).toBe('invalid_transition');
    }
  });

  it('returns silently for a permitted transition', () => {
    expect(() => assertTransition('draft', 'approved', permissive)).not.toThrow();
  });
});
