import { describe, expect, it } from 'vitest';
import type { Membership, MembershipRole, Profile } from '@/data/types';
import { authorize, isInternalActor, type Actor } from './actor';
import {
  PERMISSIONS,
  RECENT_AUTH_WINDOW_MS,
  permissionsForRole,
  requiresMfa,
  roleHasPermission,
} from './permissions';

const ORG = 'org_1';
const NOW = new Date('2026-08-09T12:00:00Z');

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user_1',
    displayName: 'Test User',
    email: 'user@example.ca',
    locale: 'en-CA',
    timezone: 'America/Toronto',
    mfaEnrolledAt: new Date('2026-01-01T00:00:00Z'),
    status: 'active',
    ...overrides,
  };
}

function actor(
  role: MembershipRole,
  overrides: {
    profile?: Partial<Profile>;
    projectScope?: string[] | null;
    authenticatedAt?: Date;
  } = {},
): Actor {
  const membership: Membership = {
    id: 'mem_1',
    organizationId: ORG,
    userId: 'user_1',
    role,
    projectScope: overrides.projectScope ?? null,
    acceptedAt: new Date('2026-01-01T00:00:00Z'),
    revokedAt: null,
  };
  return {
    userId: 'user_1',
    profile: profile(overrides.profile),
    memberships: [membership],
    authenticatedAt: overrides.authenticatedAt ?? NOW,
  };
}

describe('role permissions', () => {
  it('gives the platform owner every permission', () => {
    expect(permissionsForRole('platform_owner')).toHaveLength(
      PERMISSIONS.length,
    );
  });

  it('does not let a plain analyst approve plans or release reports', () => {
    // PRD 7.2: "Cannot issue refunds, change prices or release a final report."
    expect(roleHasPermission('analyst', 'plan.approve')).toBe(false);
    expect(roleHasPermission('analyst', 'report.release')).toBe(false);
    expect(roleHasPermission('analyst', 'report.approve')).toBe(false);
    expect(roleHasPermission('analyst', 'evaluation.senior_confirm')).toBe(
      false,
    );
    expect(roleHasPermission('analyst', 'billing.refund')).toBe(false);
    expect(roleHasPermission('analyst', 'ops.view_audit_log')).toBe(false);
  });

  it('lets a senior analyst approve and release', () => {
    expect(roleHasPermission('senior_analyst', 'plan.approve')).toBe(true);
    expect(roleHasPermission('senior_analyst', 'report.release')).toBe(true);
    expect(roleHasPermission('senior_analyst', 'evaluation.senior_confirm')).toBe(
      true,
    );
  });

  it('keeps a billing administrator away from audit content', () => {
    // PRD 7.6: invoices and portal only.
    expect(roleHasPermission('billing_admin', 'billing.read')).toBe(true);
    expect(roleHasPermission('billing_admin', 'project.read')).toBe(false);
    expect(roleHasPermission('billing_admin', 'finding.read')).toBe(false);
    expect(roleHasPermission('billing_admin', 'report.read_released')).toBe(
      false,
    );
  });

  it('keeps a client viewer read-only', () => {
    expect(roleHasPermission('client_viewer', 'report.read_released')).toBe(
      true,
    );
    expect(roleHasPermission('client_viewer', 'finding.update_remediation')).toBe(
      false,
    );
    expect(roleHasPermission('client_viewer', 'comment.write_customer')).toBe(
      false,
    );
    expect(roleHasPermission('client_viewer', 'report.export')).toBe(false);
  });

  it('never grants a client role internal-only permissions', () => {
    const internalOnly = [
      'comment.read_internal',
      'comment.write_internal',
      'report.read_draft',
      'evaluation.review',
      'finding.update_internal',
      'ops.view_audit_log',
      'scenario.read_library',
    ] as const;

    for (const role of [
      'client_owner',
      'client_contributor',
      'client_viewer',
      'billing_admin',
    ] as const) {
      for (const permission of internalOnly) {
        expect(
          roleHasPermission(role, permission),
          `${role} must not have ${permission}`,
        ).toBe(false);
      }
    }
  });

  it('only lets the Client Owner accept risk', () => {
    // FR-FND-004.
    expect(roleHasPermission('client_owner', 'finding.accept_risk')).toBe(true);
    expect(roleHasPermission('client_contributor', 'finding.accept_risk')).toBe(
      false,
    );
  });

  it('only lets internal roles record a retest outcome', () => {
    expect(roleHasPermission('analyst', 'finding.record_retest_outcome')).toBe(
      true,
    );
    expect(
      roleHasPermission('client_owner', 'finding.record_retest_outcome'),
    ).toBe(false);
  });
});

describe('authorize', () => {
  it('denies an unauthenticated caller', () => {
    expect(authorize(null, ORG, 'project.read')).toMatchObject({
      allowed: false,
      code: 'NOT_AUTHENTICATED',
    });
  });

  it('denies a caller with no membership in the organization', () => {
    const result = authorize(actor('client_owner'), 'other_org', 'project.read');
    expect(result).toMatchObject({ allowed: false, code: 'NOT_A_MEMBER' });
  });

  it('does not reveal whether the organization exists', () => {
    const result = authorize(actor('client_owner'), 'other_org', 'project.read');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      // Same wording as an out-of-scope project, so the message cannot be used
      // to probe for existence.
      expect(result.message).toBe(
        'This item does not exist or you do not have access to it.',
      );
    }
  });

  it('allows a permitted action', () => {
    expect(
      authorize(actor('client_owner'), ORG, 'project.update_onboarding'),
    ).toMatchObject({ allowed: true, role: 'client_owner' });
  });

  it('denies a suspended account before checking anything else', () => {
    const suspended = actor('platform_owner', {
      profile: { status: 'suspended' },
    });
    expect(authorize(suspended, ORG, 'project.read')).toMatchObject({
      allowed: false,
      code: 'ACCOUNT_SUSPENDED',
    });
  });

  it('requires MFA for internal roles', () => {
    // FR-AUTH-002 is P0 for internal roles.
    const noMfa = actor('analyst', { profile: { mfaEnrolledAt: null } });
    expect(authorize(noMfa, ORG, 'project.read')).toMatchObject({
      allowed: false,
      code: 'MFA_REQUIRED',
    });
  });

  it('does not require MFA for client roles at launch', () => {
    const noMfa = actor('client_owner', { profile: { mfaEnrolledAt: null } });
    expect(authorize(noMfa, ORG, 'project.read').allowed).toBe(true);
    expect(requiresMfa('client_owner')).toBe(false);
  });

  it('restricts a scoped analyst to assigned projects', () => {
    const scoped = actor('analyst', { projectScope: ['proj_1'] });
    expect(
      authorize(scoped, ORG, 'project.read', { projectId: 'proj_1' }).allowed,
    ).toBe(true);
    expect(
      authorize(scoped, ORG, 'project.read', { projectId: 'proj_2' }),
    ).toMatchObject({ allowed: false, code: 'PROJECT_OUT_OF_SCOPE' });
  });

  it('lets an unscoped analyst reach any project in the organization', () => {
    const unscoped = actor('analyst', { projectScope: null });
    expect(
      authorize(unscoped, ORG, 'project.read', { projectId: 'anything' })
        .allowed,
    ).toBe(true);
  });

  it('requires recent authentication for high-consequence actions', () => {
    // PRD 7.7.
    const stale = actor('platform_owner', {
      authenticatedAt: new Date(NOW.getTime() - RECENT_AUTH_WINDOW_MS - 1000),
    });
    expect(
      authorize(stale, ORG, 'report.release', { now: NOW }),
    ).toMatchObject({ allowed: false, code: 'REAUTH_REQUIRED' });

    // An ordinary read is unaffected by session age.
    expect(authorize(stale, ORG, 'project.read', { now: NOW }).allowed).toBe(
      true,
    );
  });

  it('allows a high-consequence action within the re-auth window', () => {
    const fresh = actor('platform_owner', {
      authenticatedAt: new Date(NOW.getTime() - 60_000),
    });
    expect(authorize(fresh, ORG, 'report.release', { now: NOW }).allowed).toBe(
      true,
    );
  });
});

describe('isInternalActor', () => {
  it('identifies internal roles', () => {
    expect(isInternalActor(actor('analyst'))).toBe(true);
    expect(isInternalActor(actor('platform_owner'))).toBe(true);
    expect(isInternalActor(actor('client_owner'))).toBe(false);
    expect(isInternalActor(actor('billing_admin'))).toBe(false);
  });
});
