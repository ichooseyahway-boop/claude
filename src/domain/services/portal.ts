import type {
  ClientFinding,
  Comment,
  Finding,
  Notification,
  Project,
  Report,
} from '@/data/types';
import { compareSeverity, type Severity } from '@/domain/findings/findings';
import {
  audit,
  fail,
  ok,
  permit,
  type ServiceContext,
  type ServiceResult,
} from './context';

/**
 * Client portal read model.
 *
 * PRD refs: FR-PORT-001..003, 11.3.
 *
 * The single rule this file enforces: a customer sees released work and their
 * own remediation state, never internal working material. Two mechanisms carry
 * that, and both are needed.
 *
 *  1. The return types omit `internalNotes` structurally, so a component cannot
 *     render it even by accident — `ClientFinding` is `Omit<Finding,
 *     'internalNotes'>` and there is no cast that reintroduces it.
 *  2. The queries filter to released reports and customer-visible comments, so
 *     the field never leaves the database in the first place.
 *
 * Row-level security is the third layer, in the database.
 */

export interface PortalProjectSummary {
  project: Project;
  releasedReportCount: number;
  latestReport: Report | null;
  openFindingCount: number;
  criticalOrHighOpenCount: number;
}

/** Projects the actor can see in an organization (FR-PORT-001). */
export async function listPortalProjects(
  context: ServiceContext,
  organizationId: string,
): Promise<ServiceResult<PortalProjectSummary[]>> {
  const decision = permit(context, organizationId, 'project.read');
  if (!decision.allowed) return fail(decision.code, decision.message);

  const projects =
    await context.data.projects.listForOrganization(organizationId);
  const visible = projects.filter((project) =>
    isProjectInScope(context, organizationId, project.id),
  );

  const summaries: PortalProjectSummary[] = [];
  for (const project of visible) {
    const reports = await context.data.reports.listForProject(
      organizationId,
      project.id,
    );
    const released = reports
      .filter((r) => r.status === 'released')
      .sort((a, b) => b.version - a.version);

    const findings = await context.data.findings.listForProject(
      organizationId,
      project.id,
    );
    // Only findings a customer can already see: those on a released report.
    const releasedRunIds = new Set(released.map((r) => r.testRunId));
    const visibleFindings = findings.filter((f) =>
      releasedRunIds.has(f.testRunId),
    );
    const open = visibleFindings.filter((f) => isOpenStatus(f.status));

    summaries.push({
      project,
      releasedReportCount: released.length,
      latestReport: released[0] ?? null,
      openFindingCount: open.length,
      criticalOrHighOpenCount: open.filter(
        (f) => f.severity === 'critical' || f.severity === 'high',
      ).length,
    });
  }

  return ok(summaries);
}

/**
 * Findings a customer may see for a project (FR-PORT-002).
 *
 * Restricted to findings carried by a released report. A finding that exists
 * only on a draft is internal working material: showing it would leak an
 * unreviewed judgement the analyst has not stood behind yet.
 */
export async function listPortalFindings(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
): Promise<ServiceResult<ClientFinding[]>> {
  const decision = permit(context, organizationId, 'finding.read', {
    projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const reports = await context.data.reports.listForProject(
    organizationId,
    projectId,
  );
  const releasedRunIds = new Set(
    reports.filter((r) => r.status === 'released').map((r) => r.testRunId),
  );

  const findings = await context.data.findings.listForProject(
    organizationId,
    projectId,
  );

  return ok(
    findings
      .filter((f) => releasedRunIds.has(f.testRunId))
      .sort((a, b) => compareSeverity(a.severity, b.severity))
      .map(toClientFinding),
  );
}

/**
 * Read a released report (FR-PORT-002, FR-RPT-005).
 *
 * A draft, in-review or superseded report is `NOT_FOUND` for a client, not
 * `ROLE_NOT_PERMITTED`: the difference would tell a customer that a report
 * about them exists and is being withheld, which is a disclosure in itself.
 * Internal roles read any status.
 */
export async function readPortalReport(
  context: ServiceContext,
  organizationId: string,
  reportId: string,
): Promise<ServiceResult<{ report: Report; findings: ClientFinding[] }>> {
  const report = await context.data.reports.findById(organizationId, reportId);
  if (!report) return fail('NOT_FOUND', 'No such report.');

  const decision = permit(context, organizationId, 'report.read_released', {
    projectId: report.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const internal = ['platform_owner', 'analyst', 'senior_analyst'].includes(
    decision.role,
  );
  if (!internal && report.status !== 'released') {
    return fail('NOT_FOUND', 'No such report.');
  }

  const findings = await context.data.findings.listForRun(
    organizationId,
    report.testRunId,
  );

  await context.data.reports.recordAccess({
    organizationId,
    reportId,
    userId: context.actor?.userId ?? null,
    action: 'viewed',
    at: context.now(),
  });

  await audit(context, {
    organizationId,
    action: 'report.viewed',
    objectType: 'report',
    objectId: reportId,
    outcome: 'success',
    riskLevel: 'low',
  });

  return ok({
    report,
    findings: findings
      .slice()
      .sort((a, b) => compareSeverity(a.severity, b.severity))
      .map(toClientFinding),
  });
}

/**
 * Comments on an object, filtered by what the caller may see (FR-PORT-003).
 *
 * Visibility is derived from the caller's role here rather than accepted as a
 * parameter. A visibility flag passed in from a page is one refactor away from
 * being passed in from a query string, and the failure mode is silent: internal
 * analyst discussion rendered to the customer it is about.
 */
export async function listComments(
  context: ServiceContext,
  organizationId: string,
  objectType: Comment['objectType'],
  objectId: string,
  options: { projectId?: string } = {},
): Promise<ServiceResult<Comment[]>> {
  const decision = permit(context, organizationId, 'project.read', options);
  if (!decision.allowed) return fail(decision.code, decision.message);

  const canReadInternal = permit(
    context,
    organizationId,
    'comment.read_internal',
    options,
  ).allowed;

  return ok(
    await context.data.comments.listForObject(
      organizationId,
      objectType,
      objectId,
      canReadInternal ? 'all' : 'customer',
    ),
  );
}

/** Post a comment (FR-PORT-003). */
export async function postComment(
  context: ServiceContext,
  organizationId: string,
  input: {
    objectType: Comment['objectType'];
    objectId: string;
    projectId: string;
    content: string;
    visibility: Comment['visibility'];
  },
): Promise<ServiceResult<Comment>> {
  const permission =
    input.visibility === 'internal'
      ? 'comment.write_internal'
      : 'comment.write_customer';

  const decision = permit(context, organizationId, permission, {
    projectId: input.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  if (input.content.trim() === '') {
    return fail('VALIDATION_FAILED', 'A comment cannot be empty.');
  }

  const comment: Comment = {
    id: context.newId(),
    organizationId,
    objectType: input.objectType,
    objectId: input.objectId,
    authorId: context.actor.userId,
    visibility: input.visibility,
    content: input.content.trim(),
    createdAt: context.now(),
  };

  return ok(await context.data.comments.create(comment));
}

/** Notifications for the signed-in user (FR-NOTIF-001). */
export async function listNotifications(
  context: ServiceContext,
  unreadOnly = false,
): Promise<ServiceResult<Notification[]>> {
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');
  return ok(
    await context.data.notifications.listForUser(
      context.actor.userId,
      unreadOnly,
    ),
  );
}

export async function markNotificationRead(
  context: ServiceContext,
  notificationId: string,
): Promise<ServiceResult<void>> {
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');
  await context.data.notifications.markRead(
    context.actor.userId,
    notificationId,
    context.now(),
  );
  return ok(undefined);
}

/**
 * Strip internal notes.
 *
 * Destructuring rather than `delete` or a field list, so adding a field to
 * `Finding` cannot silently omit it from the client view — the rest spread
 * carries new fields through, and only `internalNotes` is named.
 */
export function toClientFinding(finding: Finding): ClientFinding {
  const { internalNotes: _internalNotes, ...rest } = finding;
  return rest;
}

export function isOpenStatus(status: Finding['status']): boolean {
  return !['resolved', 'not_applicable', 'risk_accepted'].includes(status);
}

export function severityCounts(
  findings: Array<{ severity: Severity }>,
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    observation: 0,
  };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

function isProjectInScope(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
): boolean {
  const membership = context.actor?.memberships.find(
    (m) => m.organizationId === organizationId,
  );
  if (!membership) return false;
  return membership.projectScope === null
    ? true
    : membership.projectScope.includes(projectId);
}
