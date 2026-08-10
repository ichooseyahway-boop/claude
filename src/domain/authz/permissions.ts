/**
 * Role and permission matrix (PRD §7).
 *
 * PRD 7.7 sets the rules this module implements: deny by default, enforce
 * server-side, never treat a hidden button as authorization, and require
 * recent authentication for the highest-risk actions.
 *
 * This is the *application* half of authorization. The database half is Row
 * Level Security (PRD 16.1). Both are required: this module cannot protect
 * against a query that forgets to filter, and RLS cannot express "releasing a
 * report requires re-authentication within 15 minutes".
 */

export const ROLES = [
  'platform_owner',
  'analyst',
  'senior_analyst',
  'client_owner',
  'client_contributor',
  'client_viewer',
  'billing_admin',
] as const;

export type Role = (typeof ROLES)[number];

/** Roles that belong to the service provider rather than a customer. */
export const INTERNAL_ROLES: readonly Role[] = ['platform_owner', 'analyst', 'senior_analyst'];

export function isInternalRole(role: Role): boolean {
  return INTERNAL_ROLES.includes(role);
}

export const PERMISSIONS = [
  // Organization and membership
  'organization:read',
  'organization:update',
  'organization:delete',
  'membership:invite',
  'membership:change_role',

  // Billing
  'billing:read',
  'billing:open_portal',
  'billing:refund',
  'billing:override_entitlement',

  // Projects and onboarding
  'project:read',
  'project:create',
  'project:update',
  'project:submit_onboarding',
  'project:sign_authorization',
  'project:scope_decision',
  'project:assign_analyst',

  // Scenarios and runs
  'scenario_template:read',
  'scenario_template:manage',
  'plan:create',
  'plan:approve',
  'run:create',
  'run:execute',
  'run:pause',
  'run:kill_switch',

  // Evaluation and findings
  'evaluation:run',
  'evaluation:override',
  'finding:read',
  'finding:create',
  'finding:update_remediation',
  'finding:accept_risk',
  'finding:request_retest',

  // Reports
  'report:read_released',
  'report:read_draft',
  'report:draft',
  'report:approve',
  'report:release',
  'report:export',

  // Comments
  'comment:read_customer',
  'comment:read_internal',
  'comment:write_customer',
  'comment:write_internal',

  // Governance
  'audit_event:read',
  'security_event:read',
  'privacy_request:create',
  'privacy_request:process',
  'feature_flag:manage',
  'config:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Permissions granted to each role.
 *
 * Deliberate omissions worth naming:
 * - `analyst` has no `billing:refund`, no price control and no `report:release`
 *   (PRD 7.2). Release is a `senior_analyst`/`platform_owner` action.
 * - `billing_admin` gets billing and nothing else — no transcripts, no reports
 *   (PRD 7.6) — unless separately granted project access, which is modelled as
 *   a second membership row, not as a wider role.
 * - `client_viewer` gets released reports only. No drafts, no internal notes,
 *   no credentials (PRD 7.5).
 * - Nobody gets an impersonation permission. PRD 7.1 prohibits it by default,
 *   so it does not exist in the matrix at all.
 */
const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = Object.freeze({
  platform_owner: [...PERMISSIONS],

  senior_analyst: [
    'organization:read',
    'project:read',
    'project:update',
    'project:scope_decision',
    'project:assign_analyst',
    'scenario_template:read',
    'scenario_template:manage',
    'plan:create',
    'plan:approve',
    'run:create',
    'run:execute',
    'run:pause',
    'evaluation:run',
    'evaluation:override',
    'finding:read',
    'finding:create',
    'report:read_released',
    'report:read_draft',
    'report:draft',
    'report:approve',
    'report:release',
    'report:export',
    'comment:read_customer',
    'comment:read_internal',
    'comment:write_customer',
    'comment:write_internal',
    'audit_event:read',
  ],

  analyst: [
    'organization:read',
    'project:read',
    'project:update',
    'project:scope_decision',
    'scenario_template:read',
    'plan:create',
    'run:create',
    'run:execute',
    'run:pause',
    'evaluation:run',
    'evaluation:override',
    'finding:read',
    'finding:create',
    'report:read_released',
    'report:read_draft',
    'report:draft',
    'comment:read_customer',
    'comment:read_internal',
    'comment:write_customer',
    'comment:write_internal',
  ],

  client_owner: [
    'organization:read',
    'organization:update',
    'organization:delete',
    'membership:invite',
    'membership:change_role',
    'billing:read',
    'billing:open_portal',
    'project:read',
    'project:create',
    'project:update',
    'project:submit_onboarding',
    'project:sign_authorization',
    'finding:read',
    'finding:update_remediation',
    'finding:accept_risk',
    'finding:request_retest',
    'report:read_released',
    'report:export',
    'comment:read_customer',
    'comment:write_customer',
    'privacy_request:create',
  ],

  client_contributor: [
    'organization:read',
    'project:read',
    'project:update',
    'finding:read',
    'finding:update_remediation',
    'finding:request_retest',
    'report:read_released',
    'report:export',
    'comment:read_customer',
    'comment:write_customer',
  ],

  client_viewer: ['organization:read', 'project:read', 'finding:read', 'report:read_released'],

  billing_admin: ['organization:read', 'billing:read', 'billing:open_portal'],
});

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ---------------------------------------------------------------------------
// Access decisions
// ---------------------------------------------------------------------------

export interface Membership {
  readonly organizationId: string;
  readonly userId: string;
  readonly role: Role;
  /**
   * When set, the member may only reach these project IDs (PRD 7.2 "access
   * only assigned projects"). `null` means every project in the organization.
   */
  readonly projectScope: readonly string[] | null;
  readonly revokedAt: string | null;
}

export interface AccessRequest {
  readonly permission: Permission;
  readonly organizationId: string;
  /** Required for any project-scoped object. */
  readonly projectId?: string;
}

export type AccessDenialCode =
  | 'NO_ACTIVE_MEMBERSHIP'
  | 'WRONG_ORGANIZATION'
  | 'PERMISSION_NOT_GRANTED'
  | 'PROJECT_OUT_OF_SCOPE'
  | 'REAUTHENTICATION_REQUIRED';

export type AccessDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: AccessDenialCode; readonly message: string };

const DENIED_NO_MEMBERSHIP: AccessDecision = {
  allowed: false,
  code: 'NO_ACTIVE_MEMBERSHIP',
  message: 'No active membership for this organization.',
};

/**
 * Actions that require recent authentication (PRD 7.7).
 *
 * A valid session is not enough for these — the user must have re-entered a
 * factor recently, so a stolen or forgotten-open session cannot release a
 * report or delete an organization.
 */
export const REAUTHENTICATION_REQUIRED_PERMISSIONS: readonly Permission[] = [
  'membership:change_role',
  'report:release',
  'organization:delete',
  'billing:refund',
  'billing:override_entitlement',
  'run:kill_switch',
  'feature_flag:manage',
];

/** How recent "recent" is, in seconds. */
export const REAUTHENTICATION_MAX_AGE_SECONDS = 15 * 60;

export interface AuthContext {
  readonly userId: string;
  readonly memberships: readonly Membership[];
  /** Seconds since the user last completed an authentication factor. */
  readonly secondsSinceAuthentication?: number;
}

/**
 * The single authorization decision point for application code.
 *
 * Returns a decision rather than throwing so the caller can choose between a
 * 403 response and a UI affordance, and so the denial code can be written to
 * `audit_events` (PRD 20.2 scenario 5 expects a security event on a
 * cross-tenant attempt).
 */
export function authorize(context: AuthContext, request: AccessRequest): AccessDecision {
  const membership = context.memberships.find(
    (candidate) =>
      candidate.organizationId === request.organizationId &&
      candidate.userId === context.userId &&
      candidate.revokedAt === null,
  );

  if (membership === undefined) {
    // Deliberately identical to the "wrong organization" case: telling an
    // attacker whether an organization exists is itself a disclosure.
    return DENIED_NO_MEMBERSHIP;
  }

  if (!roleHasPermission(membership.role, request.permission)) {
    return {
      allowed: false,
      code: 'PERMISSION_NOT_GRANTED',
      message: `Role "${membership.role}" does not grant "${request.permission}".`,
    };
  }

  if (membership.projectScope !== null) {
    if (request.projectId === undefined) {
      return {
        allowed: false,
        code: 'PROJECT_OUT_OF_SCOPE',
        message: 'This membership is project-scoped and the request did not name a project.',
      };
    }

    if (!membership.projectScope.includes(request.projectId)) {
      return {
        allowed: false,
        code: 'PROJECT_OUT_OF_SCOPE',
        message: 'This project is not assigned to the requesting user.',
      };
    }
  }

  if (REAUTHENTICATION_REQUIRED_PERMISSIONS.includes(request.permission)) {
    const age = context.secondsSinceAuthentication;

    if (age === undefined || age > REAUTHENTICATION_MAX_AGE_SECONDS) {
      return {
        allowed: false,
        code: 'REAUTHENTICATION_REQUIRED',
        message: 'This action requires recent authentication. Please confirm your identity again.',
      };
    }
  }

  return { allowed: true };
}

/**
 * PRD 7.7 / FR-PORT-002: internal notes are never exposed to a customer.
 * Comment visibility is checked by role, not by the caller remembering to
 * filter.
 */
export function canReadInternalNotes(role: Role): boolean {
  return roleHasPermission(role, 'comment:read_internal');
}
