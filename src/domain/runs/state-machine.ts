/**
 * Test run state machine.
 *
 * PRD ref: FR-RUN-001.
 *
 *   draft -> approved -> queued -> running -> review_required
 *         -> report_draft -> released
 *
 * Exceptional states: paused, failed, cancelled, superseded.
 *
 * Transitions are validated here and enforced server-side before any write.
 * `released` is terminal except for `superseded`, because a released report is
 * immutable and a correction produces a new version (FR-RPT-004).
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

export function isRunState(value: unknown): value is RunState {
  return (
    typeof value === 'string' &&
    (RUN_STATES as readonly string[]).includes(value)
  );
}

/**
 * Roles permitted to drive a transition. Client roles appear nowhere in this
 * map: a customer can request a retest, but only internal staff move a run.
 */
export type ActorRole =
  'platform_owner' | 'analyst' | 'senior_analyst' | 'system';

interface TransitionRule {
  to: RunState;
  roles: readonly ActorRole[];
  /** Human-readable reason required on the audit event. */
  requiresReason?: boolean;
}

const TRANSITIONS: Record<RunState, readonly TransitionRule[]> = {
  draft: [
    { to: 'approved', roles: ['platform_owner', 'senior_analyst'] },
    {
      to: 'cancelled',
      roles: ['platform_owner', 'analyst'],
      requiresReason: true,
    },
  ],
  approved: [
    { to: 'queued', roles: ['platform_owner', 'analyst', 'system'] },
    {
      to: 'draft',
      roles: ['platform_owner', 'senior_analyst'],
      requiresReason: true,
    },
    {
      to: 'cancelled',
      roles: ['platform_owner', 'analyst'],
      requiresReason: true,
    },
  ],
  queued: [
    {
      to: 'running',
      roles: ['system', 'analyst', 'senior_analyst', 'platform_owner'],
    },
    {
      to: 'paused',
      roles: ['platform_owner', 'analyst'],
      requiresReason: true,
    },
    {
      to: 'cancelled',
      roles: ['platform_owner', 'analyst'],
      requiresReason: true,
    },
    { to: 'failed', roles: ['system'], requiresReason: true },
  ],
  running: [
    {
      to: 'review_required',
      roles: ['system', 'analyst', 'senior_analyst', 'platform_owner'],
    },
    {
      to: 'paused',
      roles: ['platform_owner', 'analyst'],
      requiresReason: true,
    },
    { to: 'failed', roles: ['system'], requiresReason: true },
    { to: 'cancelled', roles: ['platform_owner'], requiresReason: true },
  ],
  review_required: [
    {
      to: 'report_draft',
      roles: ['analyst', 'senior_analyst', 'platform_owner'],
    },
    {
      to: 'running',
      roles: ['analyst', 'platform_owner'],
      requiresReason: true,
    },
    {
      to: 'paused',
      roles: ['platform_owner', 'analyst'],
      requiresReason: true,
    },
    { to: 'cancelled', roles: ['platform_owner'], requiresReason: true },
  ],
  report_draft: [
    // Release is gated by `canRelease` in addition to this transition.
    { to: 'released', roles: ['platform_owner', 'senior_analyst'] },
    {
      to: 'review_required',
      roles: ['analyst', 'senior_analyst', 'platform_owner'],
      requiresReason: true,
    },
    { to: 'cancelled', roles: ['platform_owner'], requiresReason: true },
  ],
  // A released run is immutable. It can only be marked superseded when a
  // corrected version is released (FR-RPT-004).
  released: [
    {
      to: 'superseded',
      roles: ['platform_owner', 'senior_analyst'],
      requiresReason: true,
    },
  ],
  paused: [
    { to: 'queued', roles: ['platform_owner', 'analyst'] },
    { to: 'running', roles: ['platform_owner', 'analyst'] },
    { to: 'review_required', roles: ['platform_owner', 'analyst'] },
    { to: 'cancelled', roles: ['platform_owner'], requiresReason: true },
  ],
  failed: [
    {
      to: 'queued',
      roles: ['platform_owner', 'analyst'],
      requiresReason: true,
    },
    { to: 'cancelled', roles: ['platform_owner'], requiresReason: true },
  ],
  cancelled: [],
  superseded: [],
};

export const TERMINAL_STATES: readonly RunState[] = ['cancelled', 'superseded'];

export interface TransitionRequest {
  from: RunState;
  to: RunState;
  role: ActorRole;
  reason?: string;
  /**
   * Global execution kill switch (FR-RUN-004). When engaged, no run may enter
   * an outbound-execution state, but review, reporting and release of already
   * captured evidence continue.
   */
  executionKillSwitchEngaged?: boolean;
}

export type TransitionDenialCode =
  | 'INVALID_TRANSITION'
  | 'ROLE_NOT_PERMITTED'
  | 'REASON_REQUIRED'
  | 'EXECUTION_DISABLED';

export type TransitionResult =
  | { allowed: true }
  | { allowed: false; code: TransitionDenialCode; message: string };

/** States that cause outbound requests to the customer's system. */
export const OUTBOUND_EXECUTION_STATES: readonly RunState[] = [
  'queued',
  'running',
];

export function canTransition(request: TransitionRequest): TransitionResult {
  const rule = TRANSITIONS[request.from].find((t) => t.to === request.to);

  if (!rule) {
    return {
      allowed: false,
      code: 'INVALID_TRANSITION',
      message: `A run cannot move from ${request.from} to ${request.to}.`,
    };
  }

  if (!rule.roles.includes(request.role)) {
    return {
      allowed: false,
      code: 'ROLE_NOT_PERMITTED',
      message: `Role ${request.role} may not move a run from ${request.from} to ${request.to}.`,
    };
  }

  if (rule.requiresReason && (request.reason ?? '').trim() === '') {
    return {
      allowed: false,
      code: 'REASON_REQUIRED',
      message: `Moving a run from ${request.from} to ${request.to} requires a recorded reason.`,
    };
  }

  if (
    request.executionKillSwitchEngaged &&
    OUTBOUND_EXECUTION_STATES.includes(request.to)
  ) {
    return {
      allowed: false,
      code: 'EXECUTION_DISABLED',
      message:
        'The global execution kill switch is engaged. New outbound test execution is disabled; report access and billing administration are unaffected.',
    };
  }

  return { allowed: true };
}

export function allowedTransitions(
  from: RunState,
  role: ActorRole,
): RunState[] {
  return TRANSITIONS[from]
    .filter((rule) => rule.roles.includes(role))
    .map((rule) => rule.to);
}

/**
 * Release gate.
 *
 * PRD ref: FR-RPT-003. Every condition must hold before a report becomes
 * client-visible. This is deliberately a pure function so the same gate can be
 * evaluated by the release API, by the preview screen and by tests.
 */
export interface ReleaseGateInput {
  runState: RunState;
  /** Every P0 scenario has an approved (human-reviewed) score. */
  allRequiredScenariosReviewed: boolean;
  /** Every critical/high candidate has been adjudicated by a human. */
  allCriticalHighAdjudicated: boolean;
  scopeAndLimitationsComplete: boolean;
  previewGenerated: boolean;
  /** Release scanner found no internal notes in customer-visible content. */
  noInternalNotesVisible: boolean;
  /** Release scanner found no secrets or unredacted restricted data. */
  noSecretsOrRestrictedData: boolean;
  reviewerUserId: string | null;
  reviewerRole: ActorRole | null;
  /** Authorization was active for every test in the run (16.9, 23.1). */
  authorizationActiveForAllTests: boolean;
}

export type ReleaseBlockCode =
  | 'RUN_NOT_IN_REPORT_DRAFT'
  | 'SCENARIOS_NOT_REVIEWED'
  | 'CRITICAL_HIGH_NOT_ADJUDICATED'
  | 'SCOPE_INCOMPLETE'
  | 'PREVIEW_NOT_GENERATED'
  | 'INTERNAL_NOTES_VISIBLE'
  | 'SECRETS_OR_RESTRICTED_DATA_PRESENT'
  | 'REVIEWER_NOT_AUTHORIZED'
  | 'AUTHORIZATION_NOT_ACTIVE';

export interface ReleaseGateResult {
  canRelease: boolean;
  blockers: ReleaseBlockCode[];
}

const RELEASE_APPROVER_ROLES: readonly ActorRole[] = [
  'platform_owner',
  'senior_analyst',
];

export function evaluateReleaseGate(
  input: ReleaseGateInput,
): ReleaseGateResult {
  const blockers: ReleaseBlockCode[] = [];

  if (input.runState !== 'report_draft') {
    blockers.push('RUN_NOT_IN_REPORT_DRAFT');
  }
  if (!input.allRequiredScenariosReviewed) {
    blockers.push('SCENARIOS_NOT_REVIEWED');
  }
  if (!input.allCriticalHighAdjudicated) {
    blockers.push('CRITICAL_HIGH_NOT_ADJUDICATED');
  }
  if (!input.scopeAndLimitationsComplete) {
    blockers.push('SCOPE_INCOMPLETE');
  }
  if (!input.previewGenerated) {
    blockers.push('PREVIEW_NOT_GENERATED');
  }
  if (!input.noInternalNotesVisible) {
    blockers.push('INTERNAL_NOTES_VISIBLE');
  }
  if (!input.noSecretsOrRestrictedData) {
    blockers.push('SECRETS_OR_RESTRICTED_DATA_PRESENT');
  }
  if (
    input.reviewerUserId === null ||
    input.reviewerRole === null ||
    !RELEASE_APPROVER_ROLES.includes(input.reviewerRole)
  ) {
    blockers.push('REVIEWER_NOT_AUTHORIZED');
  }
  if (!input.authorizationActiveForAllTests) {
    blockers.push('AUTHORIZATION_NOT_ACTIVE');
  }

  return { canRelease: blockers.length === 0, blockers };
}
