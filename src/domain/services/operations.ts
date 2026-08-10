import type { Project, Report, TestRun } from '@/data/types';
import { checkRelease, type ReleaseCheck } from './reporting';
import {
  fail,
  ok,
  permit,
  type ServiceContext,
  type ServiceResult,
} from './context';

/**
 * Operations workspace read model.
 *
 * PRD refs: FR-OPS-001 (delivery queue), FR-OPS-003 (release queue), 11.4.
 *
 * Every function here reads across tenants, which is exactly the code path PRD
 * 16.2 warns about. Two consequences, both deliberate:
 *
 *  - The permission checked is an internal-only one, and it is checked per
 *    organization rather than once globally, so a scoped analyst never widens
 *    their reach by loading a queue.
 *  - Nothing here returns finding narrative or captured content. A queue needs
 *    counts and states; pulling customer content into a cross-tenant list is
 *    how a queue becomes a data-exposure surface.
 */

export interface QueueItem {
  project: Project;
  organizationName: string;
  activeRun: TestRun | null;
  /** The state the project is waiting on, for grouping. */
  waitingOn: Project['status'];
  dueDate: Date | null;
  /** True when the due date has passed and the project is not released. */
  overdue: boolean;
}

const ACTIVE_STATUSES: Project['status'][] = [
  'onboarding',
  'scope_review',
  'planning',
  'executing',
  'analyst_review',
  'release_review',
  'blocked',
];

/**
 * The delivery queue (FR-OPS-001).
 *
 * Ordered by overdue first, then by due date, then by status. Projects with no
 * due date sort last rather than first: an undated project is not urgent, and
 * sorting nulls to the top is how real queues get ignored.
 */
export async function deliveryQueue(
  context: ServiceContext,
): Promise<ServiceResult<QueueItem[]>> {
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  const projects = await context.data.projects.listByStatus(ACTIVE_STATUSES);
  const now = context.now();
  const items: QueueItem[] = [];

  for (const project of projects) {
    // Per-organization, not once: a scoped analyst must not see a project in an
    // organization they do not belong to just because the query was global.
    const decision = permit(context, project.organizationId, 'ops.view_queue', {
      projectId: project.id,
    });
    if (!decision.allowed) continue;

    const organization = await context.data.organizations.findById(
      project.organizationId,
    );
    const runs = await context.data.runs.listForProject(
      project.organizationId,
      project.id,
    );
    const activeRun =
      runs.find(
        (r) => !['released', 'cancelled', 'superseded'].includes(r.state),
      ) ?? null;

    items.push({
      project,
      organizationName: organization?.name ?? 'Unknown organization',
      activeRun,
      waitingOn: project.status,
      dueDate: project.dueDate,
      overdue:
        project.dueDate !== null &&
        project.dueDate.getTime() < now.getTime() &&
        project.status !== 'released',
    });
  }

  return ok(items.sort(compareQueueItems));
}

export function compareQueueItems(a: QueueItem, b: QueueItem): number {
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
  if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.project.name.localeCompare(b.project.name);
}

export interface ReleaseQueueItem {
  report: Report;
  project: Project;
  organizationName: string;
  check: ReleaseCheck;
}

/**
 * Reports awaiting release, each with its gate evaluated (FR-OPS-003).
 *
 * The blockers are computed here rather than on the release screen so the queue
 * shows *why* something is stuck without anyone opening it. A release queue
 * that only lists candidates makes the reviewer discover the blocker one report
 * at a time.
 */
export async function releaseQueue(
  context: ServiceContext,
): Promise<ServiceResult<ReleaseQueueItem[]>> {
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  const projects = await context.data.projects.listByStatus([
    'analyst_review',
    'release_review',
    'executing',
  ]);
  const items: ReleaseQueueItem[] = [];

  for (const project of projects) {
    const decision = permit(context, project.organizationId, 'report.release', {
      projectId: project.id,
    });
    if (!decision.allowed) continue;

    const organization = await context.data.organizations.findById(
      project.organizationId,
    );
    const reports = await context.data.reports.listForProject(
      project.organizationId,
      project.id,
    );

    for (const report of reports) {
      if (report.status === 'released' || report.status === 'superseded')
        continue;

      const check = await checkRelease(
        context,
        project.organizationId,
        report.id,
      );
      if (!check.ok) continue;

      items.push({
        report,
        project,
        organizationName: organization?.name ?? 'Unknown organization',
        check: check.value,
      });
    }
  }

  // Releasable first: those are the ones a reviewer can actually act on now.
  return ok(
    items.sort((a, b) => {
      if (a.check.canRelease !== b.check.canRelease) {
        return a.check.canRelease ? -1 : 1;
      }
      return a.check.blockers.length - b.check.blockers.length;
    }),
  );
}

/** Recent audit events, for the operations log (FR-OPS-005). */
export async function recentAuditEvents(
  context: ServiceContext,
  organizationId: string,
  limit = 50,
): Promise<
  ServiceResult<
    Awaited<ReturnType<ServiceContext['data']['auditEvents']['list']>>
  >
> {
  const decision = permit(context, organizationId, 'ops.view_audit_log');
  if (!decision.allowed) return fail(decision.code, decision.message);

  return ok(
    await context.data.auditEvents.list({
      organizationId,
      limit: Math.min(limit, 200),
    }),
  );
}
