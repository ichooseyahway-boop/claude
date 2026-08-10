/**
 * Test run state machine (PRD FR-RUN-001).
 *
 * Allowed happy path:
 *   draft -> approved -> queued -> running -> review_required -> report_draft -> released
 *
 * Exceptional states: paused, failed, cancelled, superseded.
 *
 * Transitions are validated here and only here, so the API layer, the worker
 * and the operations UI cannot drift apart. Every transition is expected to be
 * written to `audit_events` by the caller.
 */

export const RUN_STATES = [
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
] as const;

export type RunState = (typeof RUN_STATES)[number];

/**
 * States from which no further transition is possible.
 *
 * `released` is terminal by design: FR-RUN-001 makes released runs immutable,
 * and FR-RPT-004 requires a correction to produce a NEW report version rather
 * than reopening the released one. `superseded` is how a released run is
 * marked once a later version replaces it.
 */
export const TERMINAL_STATES: readonly RunState[] = ['cancelled', 'superseded'];

const TRANSITIONS: Readonly<Record<RunState, readonly RunState[]>> = Object.freeze({
  draft: ['approved', 'cancelled'],
  approved: ['queued', 'draft', 'cancelled'],
  queued: ['running', 'paused', 'cancelled', 'failed'],
  running: ['review_required', 'paused', 'failed', 'cancelled'],
  review_required: ['report_draft', 'running', 'paused', 'cancelled'],
  report_draft: ['released', 'review_required', 'paused', 'cancelled'],
  // A released run may only be superseded by a later version (FR-RPT-004).
  released: ['superseded'],
  paused: ['queued', 'running', 'review_required', 'report_draft', 'cancelled', 'failed'],
  // A failed run can be retried back into the queue, or abandoned.
  failed: ['queued', 'cancelled'],
  cancelled: [],
  superseded: [],
});

export interface TransitionContext {
  /**
   * FR-RUN-004: when the global kill switch is on, no run may enter a state
   * that performs outbound test execution. Existing reports stay accessible.
   */
  readonly executionKillSwitchEnabled?: boolean;
  /**
   * FR-ONB-002 / PRD 16.9: execution requires an active, unexpired,
   * unrevoked authorization attestation.
   */
  readonly authorizationActive?: boolean;
  /**
   * FR-RPT-003: release requires every P0 scenario reviewed and every
   * critical/high candidate adjudicated.
   */
  readonly releaseChecklistSatisfied?: boolean;
}

/** States that cause outbound requests to the customer's system. */
const EXECUTING_STATES: readonly RunState[] = ['queued', 'running'];

export type TransitionRefusal =
  | 'invalid_transition'
  | 'terminal_state'
  | 'execution_kill_switch_enabled'
  | 'authorization_not_active'
  | 'release_checklist_incomplete';

export interface TransitionDecision {
  readonly allowed: boolean;
  readonly refusal?: TransitionRefusal;
  readonly message?: string;
}

/** Structural check only: is `to` reachable from `from` at all? */
export function isTransitionAllowed(from: RunState, to: RunState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitionsFrom(from: RunState): readonly RunState[] {
  return TRANSITIONS[from];
}

/**
 * Full transition decision, including the safety gates that are not expressible
 * as graph edges.
 */
export function evaluateTransition(
  from: RunState,
  to: RunState,
  context: TransitionContext = {},
): TransitionDecision {
  if (TERMINAL_STATES.includes(from)) {
    return {
      allowed: false,
      refusal: 'terminal_state',
      message: `Run is in terminal state "${from}" and cannot transition.`,
    };
  }

  if (!isTransitionAllowed(from, to)) {
    return {
      allowed: false,
      refusal: 'invalid_transition',
      message: `Transition "${from}" -> "${to}" is not permitted.`,
    };
  }

  if (EXECUTING_STATES.includes(to)) {
    if (context.executionKillSwitchEnabled === true) {
      return {
        allowed: false,
        refusal: 'execution_kill_switch_enabled',
        message:
          'The global execution kill switch is enabled. No new outbound test execution may start.',
      };
    }

    // Absent context is treated as "not authorized". Defaulting the other way
    // would let a caller that forgot to pass context start an unauthorized test.
    if (context.authorizationActive !== true) {
      return {
        allowed: false,
        refusal: 'authorization_not_active',
        message:
          'Testing authorization is missing, expired or revoked. Execution cannot start (PRD 16.9).',
      };
    }
  }

  if (to === 'released' && context.releaseChecklistSatisfied !== true) {
    return {
      allowed: false,
      refusal: 'release_checklist_incomplete',
      message:
        'Release is blocked until every P0 scenario is reviewed and all critical/high candidates are adjudicated (FR-RPT-003).',
    };
  }

  return { allowed: true };
}

export class RunTransitionError extends Error {
  constructor(
    message: string,
    readonly refusal: TransitionRefusal,
  ) {
    super(message);
    this.name = 'RunTransitionError';
  }
}

/** Throwing wrapper for call sites that treat a refused transition as an error. */
export function assertTransition(
  from: RunState,
  to: RunState,
  context: TransitionContext = {},
): void {
  const decision = evaluateTransition(from, to, context);

  if (!decision.allowed) {
    throw new RunTransitionError(
      decision.message ?? 'Transition refused.',
      decision.refusal ?? 'invalid_transition',
    );
  }
}
