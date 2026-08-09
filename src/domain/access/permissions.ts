import type { MembershipRole } from '@/data/types';

/**
 * Permission model.
 *
 * PRD ref: 7.1–7.7.
 *
 * Principles this file encodes:
 *   - Deny by default. An action not listed for a role is refused.
 *   - Permissions are checked server-side, never inferred from a hidden button.
 *   - Sensitive actions additionally require recent authentication (7.7).
 *
 * This is the *application* half of authorization. Row-level security is the
 * other half, and neither is a substitute for the other.
 */

export const PERMISSIONS = [
  // Organization
  'organization.read',
  'organization.update',
  'organization.invite_member',
  'organization.change_member_role',
  'organization.delete',

  // Billing
  'billing.read',
  'billing.open_portal',
  'billing.refund',
  'billing.override_entitlement',

  // Project and onboarding
  'project.read',
  'project.update_onboarding',
  'project.submit_onboarding',
  'project.sign_authorization',
  'project.revoke_authorization',
  'project.upload_source',
  'project.decide_scope',
  'project.assign_analyst',

  // Scenario and plan
  'scenario.read_library',
  'scenario.author',
  'plan.build',
  'plan.approve',

  // Execution
  'run.create',
  'run.start',
  'run.pause',
  'run.capture',
  'run.cancel',

  // Evaluation
  'evaluation.run',
  'evaluation.review',
  'evaluation.override',
  'evaluation.senior_confirm',

  // Findings
  'finding.read',
  'finding.create',
  'finding.update_internal',
  'finding.update_remediation',
  'finding.accept_risk',
  'finding.record_retest_outcome',

  // Reports
  'report.read_released',
  'report.read_draft',
  'report.draft',
  'report.approve',
  'report.release',
  'report.export',

  // Collaboration
  'comment.read_internal',
  'comment.write_internal',
  'comment.write_customer',

  // Operations
  'ops.view_queue',
  'ops.view_audit_log',
  'ops.manage_feature_flags',
  'ops.manage_packages',
  'ops.view_security_events',

  // Privacy
  'privacy.request',
  'privacy.fulfil',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role → permission grants.
 *
 * Written out in full rather than derived by inheritance. A hierarchy is
 * shorter but makes it hard to answer "what exactly can a Client Contributor
 * do?" — the question that actually matters in a security review.
 */
const ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[]> = {
  platform_owner: [...PERMISSIONS],

  senior_analyst: [
    'organization.read',
    'project.read',
    'project.decide_scope',
    'project.assign_analyst',
    'scenario.read_library',
    'scenario.author',
    'plan.build',
    'plan.approve',
    'run.create',
    'run.start',
    'run.pause',
    'run.capture',
    'run.cancel',
    'evaluation.run',
    'evaluation.review',
    'evaluation.override',
    'evaluation.senior_confirm',
    'finding.read',
    'finding.create',
    'finding.update_internal',
    'finding.record_retest_outcome',
    'report.read_released',
    'report.read_draft',
    'report.draft',
    'report.approve',
    'report.release',
    'report.export',
    'comment.read_internal',
    'comment.write_internal',
    'comment.write_customer',
    'ops.view_queue',
  ],

  analyst: [
    'organization.read',
    'project.read',
    'project.decide_scope',
    'scenario.read_library',
    'scenario.author',
    'plan.build',
    'run.create',
    'run.start',
    'run.pause',
    'run.capture',
    'evaluation.run',
    'evaluation.review',
    'evaluation.override',
    'finding.read',
    'finding.create',
    'finding.update_internal',
    'finding.record_retest_outcome',
    'report.read_released',
    'report.read_draft',
    'report.draft',
    'report.export',
    'comment.read_internal',
    'comment.write_internal',
    'comment.write_customer',
    'ops.view_queue',
    // Deliberately absent: plan.approve, report.approve, report.release,
    // evaluation.senior_confirm, billing.*, ops.view_audit_log (7.2).
  ],

  client_owner: [
    'organization.read',
    'organization.update',
    'organization.invite_member',
    'organization.change_member_role',
    'billing.read',
    'billing.open_portal',
    'project.read',
    'project.update_onboarding',
    'project.submit_onboarding',
    'project.sign_authorization',
    'project.revoke_authorization',
    'project.upload_source',
    'finding.read',
    'finding.update_remediation',
    'finding.accept_risk',
    'report.read_released',
    'report.export',
    'comment.write_customer',
    'privacy.request',
  ],

  client_contributor: [
    'organization.read',
    'project.read',
    'project.update_onboarding',
    'project.upload_source',
    'finding.read',
    'finding.update_remediation',
    'report.read_released',
    'report.export',
    'comment.write_customer',
    // Deliberately absent: billing, member management, risk acceptance (7.4).
  ],

  client_viewer: [
    'organization.read',
    'project.read',
    'finding.read',
    'report.read_released',
    // Read-only. No exports of raw evidence, no comments (7.5).
  ],

  billing_admin: [
    'organization.read',
    'billing.read',
    'billing.open_portal',
    // No project, finding or report access whatsoever (7.6).
  ],
};

export function roleHasPermission(
  role: MembershipRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(
  role: MembershipRole,
): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Actions requiring recent re-authentication (7.7).
 *
 * "Require recent authentication for role changes, report release, organization
 * deletion, data export and secret replacement."
 */
export const REAUTH_REQUIRED_PERMISSIONS: readonly Permission[] = [
  'organization.change_member_role',
  'organization.delete',
  'report.release',
  'report.export',
  'billing.refund',
  'billing.override_entitlement',
];

export function requiresRecentAuth(permission: Permission): boolean {
  return REAUTH_REQUIRED_PERMISSIONS.includes(permission);
}

/** How recent "recent" is, in milliseconds. */
export const RECENT_AUTH_WINDOW_MS = 15 * 60 * 1000;

/**
 * Internal roles must have MFA enrolled (FR-AUTH-002, P0).
 *
 * This is checked at the permission boundary rather than only at sign-in so
 * that an account whose MFA is later removed loses internal access immediately.
 */
export function requiresMfa(role: MembershipRole): boolean {
  return (
    role === 'platform_owner' || role === 'analyst' || role === 'senior_analyst'
  );
}
