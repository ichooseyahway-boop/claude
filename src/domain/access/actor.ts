import type { Membership, MembershipRole, Profile } from '@/data/types';
import {
  RECENT_AUTH_WINDOW_MS,
  requiresMfa,
  requiresRecentAuth,
  roleHasPermission,
  type Permission,
} from './permissions';

/**
 * The authenticated actor and the authorization decision surface.
 *
 * PRD ref: 7.7 — "Enforce permissions server-side and at the database row
 * level", "Deny by default", "Never rely on hidden buttons as authorization".
 *
 * Every service takes an `Actor` and calls `authorize()` before doing work.
 * The result is a discriminated union rather than a thrown error so that a
 * caller has to handle denial explicitly.
 */

export interface Actor {
  userId: string;
  profile: Profile;
  /** Active memberships, already filtered to accepted and non-revoked. */
  memberships: Membership[];
  /** When this session last authenticated, for re-auth gating. */
  authenticatedAt: Date;
}

export type DenialCode =
  | 'NOT_AUTHENTICATED'
  | 'NOT_A_MEMBER'
  | 'ROLE_NOT_PERMITTED'
  | 'MFA_REQUIRED'
  | 'REAUTH_REQUIRED'
  | 'PROJECT_OUT_OF_SCOPE'
  | 'ACCOUNT_SUSPENDED';

export type AuthorizationResult =
  | { allowed: true; role: MembershipRole }
  | { allowed: false; code: DenialCode; message: string };

export interface AuthorizeOptions {
  /** Restricts analysts with a project scope to their assigned projects. */
  projectId?: string;
  /** Clock injection for tests. */
  now?: Date;
}

/**
 * Decide whether `actor` may perform `permission` in `organizationId`.
 *
 * Order of checks matters: account status first (a suspended account should not
 * learn which organizations exist), then membership, then role, then the
 * step-up requirements.
 */
export function authorize(
  actor: Actor | null,
  organizationId: string,
  permission: Permission,
  options: AuthorizeOptions = {},
): AuthorizationResult {
  if (!actor) {
    return {
      allowed: false,
      code: 'NOT_AUTHENTICATED',
      message: 'Sign in to continue.',
    };
  }

  if (actor.profile.status !== 'active') {
    return {
      allowed: false,
      code: 'ACCOUNT_SUSPENDED',
      message: 'This account is not active.',
    };
  }

  const membership = actor.memberships.find(
    (m) => m.organizationId === organizationId,
  );

  if (!membership) {
    return {
      allowed: false,
      code: 'NOT_A_MEMBER',
      message: 'This item does not exist or you do not have access to it.',
    };
  }

  if (!roleHasPermission(membership.role, permission)) {
    return {
      allowed: false,
      code: 'ROLE_NOT_PERMITTED',
      message: 'This action is not available for your role.',
    };
  }

  // FR-AUTH-002: MFA is mandatory for Platform Owner and Analyst roles.
  if (requiresMfa(membership.role) && actor.profile.mfaEnrolledAt === null) {
    return {
      allowed: false,
      code: 'MFA_REQUIRED',
      message:
        'Multi-factor authentication must be enrolled before using an internal role.',
    };
  }

  // 7.2: an analyst with a project scope reaches only assigned projects.
  if (
    options.projectId &&
    membership.projectScope !== null &&
    !membership.projectScope.includes(options.projectId)
  ) {
    return {
      allowed: false,
      code: 'PROJECT_OUT_OF_SCOPE',
      message: 'This item does not exist or you do not have access to it.',
    };
  }

  if (requiresRecentAuth(permission)) {
    const now = options.now ?? new Date();
    const age = now.getTime() - actor.authenticatedAt.getTime();
    if (age > RECENT_AUTH_WINDOW_MS) {
      return {
        allowed: false,
        code: 'REAUTH_REQUIRED',
        message: 'Confirm your identity again to complete this action.',
      };
    }
  }

  return { allowed: true, role: membership.role };
}

/** Organizations where the actor holds any active membership. */
export function actorOrganizationIds(actor: Actor): string[] {
  return actor.memberships.map((m) => m.organizationId);
}

/** True when the actor holds an internal role in any organization. */
export function isInternalActor(actor: Actor): boolean {
  return actor.memberships.some((m) =>
    ['platform_owner', 'analyst', 'senior_analyst'].includes(m.role),
  );
}

export function actorRoleIn(
  actor: Actor,
  organizationId: string,
): MembershipRole | null {
  return (
    actor.memberships.find((m) => m.organizationId === organizationId)?.role ??
    null
  );
}
