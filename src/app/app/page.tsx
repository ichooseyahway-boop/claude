import Link from 'next/link';
import { AppShell, EmptyState, StatCard } from '@/components/app/shell';
import { actorOrganizations, requirePage } from '@/lib/auth/page-guard';
import { portalNav } from '@/lib/app-nav';
import {
  listPortalProjects,
  type PortalProjectSummary,
} from '@/domain/services/portal';
import { formatDate } from '@/lib/i18n/format';

/**
 * Portal overview (FR-PORT-001).
 *
 * Lists every project the actor can reach, across all their organizations. A
 * user who belongs to two organizations sees both here rather than having to
 * pick one first — organization switching is a concept the customer did not ask
 * for and mostly does not have.
 */
export default async function PortalOverviewPage() {
  const { actor, context, m } = await requirePage();

  const summaries: Array<PortalProjectSummary & { organizationId: string }> =
    [];
  for (const organizationId of actorOrganizations(actor)) {
    const result = await listPortalProjects(context, organizationId);
    // A denial in one organization must not blank the whole page: a billing-only
    // membership alongside a client membership is an ordinary situation.
    if (!result.ok) continue;
    for (const summary of result.value) {
      summaries.push({ ...summary, organizationId });
    }
  }

  return (
    <AppShell
      locale={actor.profile.locale}
      m={m}
      title={m.app.overview.title}
      intro={m.app.overview.intro}
      nav={portalNav(actor, m, context.now())}
      navLabel={m.app.nav.label}
      userName={actor.profile.displayName}
    >
      {summaries.length === 0 ? (
        <EmptyState
          title={m.app.overview.empty}
          body={m.app.overview.emptyBody}
        />
      ) : (
        <ul className="space-y-4">
          {summaries.map((summary) => (
            <li
              key={summary.project.id}
              className="rounded-lg border border-[color:var(--border-subtle)] p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-navy-900 text-lg font-semibold">
                  {summary.project.name}
                </h2>
                <p className="text-sm text-slate-600">
                  {m.app.project.status}:{' '}
                  {m.projectStatus[summary.project.status]}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <StatCard
                  label={m.app.project.releasedReports}
                  value={summary.releasedReportCount}
                />
                <StatCard
                  label={m.app.project.openFindings}
                  value={summary.openFindingCount}
                />
                <StatCard
                  label={m.app.project.criticalOrHigh}
                  value={summary.criticalOrHighOpenCount}
                />
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-slate-600">{m.app.project.dueDate}:</dt>
                  <dd className="text-navy-900">
                    {summary.project.dueDate
                      ? formatDate(
                          summary.project.dueDate,
                          actor.profile.locale,
                        )
                      : m.app.project.noDueDate}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-slate-600">{m.app.project.locales}:</dt>
                  <dd className="text-navy-900">
                    {summary.project.locales.join(', ')}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 flex flex-wrap gap-4 text-sm">
                <Link
                  href={`/app/projects/${summary.project.id}/findings`}
                  className="text-navy-900 underline underline-offset-4"
                >
                  {m.app.project.viewFindings}
                </Link>
                {summary.latestReport ? (
                  <Link
                    href={`/app/reports/${summary.latestReport.id}`}
                    className="text-navy-900 underline underline-offset-4"
                  >
                    {m.app.project.viewLatestReport}
                  </Link>
                ) : (
                  <span className="text-slate-600">
                    {m.app.project.noReportYet}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
