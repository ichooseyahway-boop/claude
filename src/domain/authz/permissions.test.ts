import { describe, expect, it } from 'vitest';

import {
  authorize,
  canReadInternalNotes,
  isInternalRole,
  permissionsForRole,
  REAUTHENTICATION_MAX_AGE_SECONDS,
  REAUTHENTICATION_REQUIRED_PERMISSIONS,
  roleHasPermission,
  ROLES,
  type AuthContext,
  type Membership,
  type Role,
} from './permissions';

const ORG = 'org-1';
const OTHER_ORG = 'org-2';
const USER = 'user-1';

function membership(role: Role, overrides: Partial<Membership> = {}): Membership {
  return {
    organizationId: ORG,
    userId: USER,
    role,
    projectScope: null,
    revokedAt: null,
    ...overrides,
  };
}

function contextFor(role: Role, overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: USER,
    memberships: [membership(role)],
    secondsSinceAuthentication: 60,
    ...overrides,
  };
}

describe('role matrix (PRD §7)', () => {
  it('gives the platform owner every permission', () => {
    expect(permissionsForRole('platform_owner').length).toBeGreaterThan(0);
    expect(roleHasPermission('platform_owner', 'billing:refund')).toBe(true);
    expect(roleHasPermission('platform_owner', 'report:release')).toBe(true);
  });

  it('withholds refunds, pricing and release from an analyst (PRD 7.2)', () => {
    expect(roleHasPermission('analyst', 'billing:refund')).toBe(false);
    expect(roleHasPermission('analyst', 'billing:override_entitlement')).toBe(false);
    expect(roleHasPermission('analyst', 'report:release')).toBe(false);
    expect(roleHasPermission('analyst', 'report:approve')).toBe(false);
  });

  it('lets a senior analyst release, unlike a regular analyst', () => {
    expect(roleHasPermission('senior_analyst', 'report:release')).toBe(true);
  });

  it('restricts the billing administrator to billing (PRD 7.6)', () => {
    expect(roleHasPermission('billing_admin', 'billing:read')).toBe(true);
    expect(roleHasPermission('billing_admin', 'billing:open_portal')).toBe(true);

    // No audit content of any kind.
    expect(roleHasPermission('billing_admin', 'project:read')).toBe(false);
    expect(roleHasPermission('billing_admin', 'finding:read')).toBe(false);
    expect(roleHasPermission('billing_admin', 'report:read_released')).toBe(false);
  });

  it('limits the client viewer to released reports (PRD 7.5)', () => {
    expect(roleHasPermission('client_viewer', 'report:read_released')).toBe(true);
    expect(roleHasPermission('client_viewer', 'report:read_draft')).toBe(false);
    expect(roleHasPermission('client_viewer', 'comment:read_internal')).toBe(false);
    expect(roleHasPermission('client_viewer', 'finding:update_remediation')).toBe(false);
  });

  it('keeps billing away from a client contributor (PRD 7.4)', () => {
    expect(roleHasPermission('client_contributor', 'billing:read')).toBe(false);
    expect(roleHasPermission('client_contributor', 'membership:invite')).toBe(false);
  });

  it('never exposes internal notes to any customer role (PRD 7.7)', () => {
    for (const role of [
      'client_owner',
      'client_contributor',
      'client_viewer',
      'billing_admin',
    ] as Role[]) {
      expect(canReadInternalNotes(role), `${role} must not read internal notes`).toBe(false);
      expect(roleHasPermission(role, 'report:read_draft')).toBe(false);
    }
  });

  it('classifies internal roles correctly', () => {
    expect(isInternalRole('analyst')).toBe(true);
    expect(isInternalRole('senior_analyst')).toBe(true);
    expect(isInternalRole('platform_owner')).toBe(true);
    expect(isInternalRole('client_owner')).toBe(false);
  });

  it('grants no role an impersonation permission (PRD 7.1)', () => {
    for (const role of ROLES) {
      for (const permission of permissionsForRole(role)) {
        expect(permission).not.toMatch(/impersonat/i);
      }
    }
  });
});

describe('authorize — tenant isolation (PRD 16.2)', () => {
  it('denies a request against an organization the user does not belong to', () => {
    const decision = authorize(contextFor('client_owner'), {
      permission: 'project:read',
      organizationId: OTHER_ORG,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.code).toBe('NO_ACTIVE_MEMBERSHIP');
  });

  it('does not reveal whether the other organization exists', () => {
    // Same code and message whether the org exists or not.
    const missing = authorize(contextFor('client_owner'), {
      permission: 'project:read',
      organizationId: 'org-does-not-exist',
    });
    const forbidden = authorize(contextFor('client_owner'), {
      permission: 'project:read',
      organizationId: OTHER_ORG,
    });

    expect(missing).toEqual(forbidden);
  });

  it('denies a revoked membership', () => {
    const decision = authorize(
      {
        userId: USER,
        memberships: [membership('client_owner', { revokedAt: '2026-01-01T00:00:00Z' })],
      },
      { permission: 'project:read', organizationId: ORG },
    );

    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.code).toBe('NO_ACTIVE_MEMBERSHIP');
  });

  it('denies a permission the role does not carry', () => {
    const decision = authorize(contextFor('client_viewer'), {
      permission: 'finding:update_remediation',
      organizationId: ORG,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.code).toBe('PERMISSION_NOT_GRANTED');
  });
});

describe('authorize — project scoping (PRD 7.2)', () => {
  const scoped = contextFor('analyst', {
    memberships: [membership('analyst', { projectScope: ['proj-1'] })],
  });

  it('allows an assigned project', () => {
    expect(
      authorize(scoped, { permission: 'project:read', organizationId: ORG, projectId: 'proj-1' })
        .allowed,
    ).toBe(true);
  });

  it('denies an unassigned project in the same organization', () => {
    const decision = authorize(scoped, {
      permission: 'project:read',
      organizationId: ORG,
      projectId: 'proj-2',
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.code).toBe('PROJECT_OUT_OF_SCOPE');
  });

  it('denies a scoped membership when the request names no project', () => {
    const decision = authorize(scoped, { permission: 'project:read', organizationId: ORG });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.code).toBe('PROJECT_OUT_OF_SCOPE');
  });

  it('allows any project for an unscoped membership', () => {
    expect(
      authorize(contextFor('analyst'), {
        permission: 'project:read',
        organizationId: ORG,
        projectId: 'anything',
      }).allowed,
    ).toBe(true);
  });
});

describe('authorize — re-authentication (PRD 7.7)', () => {
  it('requires recent authentication for every high-risk permission', () => {
    for (const permission of REAUTHENTICATION_REQUIRED_PERMISSIONS) {
      const stale = authorize(
        contextFor('platform_owner', {
          secondsSinceAuthentication: REAUTHENTICATION_MAX_AGE_SECONDS + 1,
        }),
        { permission, organizationId: ORG },
      );

      expect(stale.allowed, `${permission} should require fresh auth`).toBe(false);
      if (stale.allowed) throw new Error('unreachable');
      expect(stale.code).toBe('REAUTHENTICATION_REQUIRED');
    }
  });

  it('allows the same permission with fresh authentication', () => {
    expect(
      authorize(contextFor('platform_owner', { secondsSinceAuthentication: 30 }), {
        permission: 'report:release',
        organizationId: ORG,
      }).allowed,
    ).toBe(true);
  });

  it('fails closed when authentication age is unknown', () => {
    const decision = authorize(
      { userId: USER, memberships: [membership('platform_owner')] },
      { permission: 'organization:delete', organizationId: ORG },
    );

    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.code).toBe('REAUTHENTICATION_REQUIRED');
  });

  it('does not require fresh authentication for ordinary reads', () => {
    expect(
      authorize(contextFor('client_owner', { secondsSinceAuthentication: 60 * 60 * 24 }), {
        permission: 'report:read_released',
        organizationId: ORG,
      }).allowed,
    ).toBe(true);
  });
});
