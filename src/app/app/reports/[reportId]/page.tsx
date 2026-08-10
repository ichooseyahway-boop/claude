import {
  AppShell,
  EmptyState,
  SeverityBadge,
  StatCard,
} from '@/components/app/shell';
import { actorOrganizations, requirePage } from '@/lib/auth/page-guard';
import { portalNav } from '@/lib/app-nav';
import { readPortalReport } from '@/domain/services/portal';
import { formatDate } from '@/lib/i18n/format';
import type { ClientFinding, Report } from '@/data/types';
import type { ReportComposition } from '@/domain/services/reporting';

/**
 * Released report (FR-PORT-002, FR-RPT-005).
 *
 * A report that is not released reads as "not available" for a customer rather
 * than "not permitted" — the difference would confirm that a report about them
 * exists and is being withheld, which is a disclosure in itself. The service
 * enforces that; this page only has to render whatever it is handed.
 */
export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const { actor, context, m } = await requirePage();

  let found: { report: Report; findings: ClientFinding[] } | null = null;
  for (const organizationId of actorOrganizations(actor)) {
    const result = await readPortalReport(context, organizationId, reportId);
    if (result.ok) {
      found = result.value;
      break;
    }
  }

  const nav = portalNav(actor, m, context.now());

  if (!found) {
    return (
      <AppShell
        locale={actor.profile.locale}
        m={m}
        title={m.app.report.title}
        nav={nav}
        navLabel={m.app.nav.label}
        userName={actor.profile.displayName}
      >
        <EmptyState
          title={m.app.report.notFound}
          body={m.app.report.notFoundBody}
        />
      </AppShell>
    );
  }

  const { report, findings } = found;
  const content = report.contentSnapshot as ReportComposition | null;

  return (
    <AppShell
      locale={actor.profile.locale}
      m={m}
      title={`${m.app.report.title} — ${m.app.report.version} ${report.version}`}
      nav={nav}
      navLabel={m.app.nav.label}
      userName={actor.profile.displayName}
    >
      {report.status === 'superseded' ? (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            {m.app.report.supersededTitle}
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {m.app.report.supersededBody}
          </p>
        </div>
      ) : null}

      {report.correctionReason ? (
        <div className="mb-6 rounded-lg border border-[color:var(--border-subtle)] p-4">
          <p className="font-medium text-slate-600">
            {m.app.report.correctionReason}
          </p>
          <p className="text-navy-900 mt-1">{report.correctionReason}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={m.app.report.score}
          value={report.score ?? '—'}
          {...(report.capApplied ? { hint: report.capApplied } : {})}
        />
        <StatCard label={m.app.report.grade} value={report.grade ?? '—'} />
        <StatCard
          label={m.app.report.parity}
          value={report.parityIndex ?? '—'}
          {...(content?.parityQualitativeOnly
            ? { hint: m.app.report.parityQualitative }
            : {})}
        />
      </div>

      {report.incomplete ? (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            {m.app.report.incomplete}
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {m.app.report.incompleteBody}
          </p>
        </div>
      ) : null}

      {content ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard
            label={m.app.report.scenariosPlanned}
            value={content.scenariosPlanned}
          />
          <StatCard
            label={m.app.report.scenariosCompleted}
            value={content.scenariosCompleted}
          />
          <StatCard
            label={m.app.report.unscorable}
            value={content.unscorableCount}
          />
        </div>
      ) : null}

      {report.releasedAt ? (
        <p className="mt-6 text-sm text-slate-600">
          {m.app.report.released}:{' '}
          {formatDate(report.releasedAt, actor.profile.locale)}
        </p>
      ) : null}

      <h2 className="text-navy-900 mt-10 text-xl font-semibold">
        {m.app.findings.title}
      </h2>
      {findings.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={m.app.findings.empty} />
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {findings.map((finding) => (
            <li
              key={finding.id}
              className="rounded-lg border border-[color:var(--border-subtle)] p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <SeverityBadge
                  severity={finding.severity}
                  label={m.severity[finding.severity]}
                />
                <span className="font-mono text-sm text-slate-600">
                  {finding.reference}
                </span>
              </div>
              <p className="text-navy-900 mt-2 font-medium">{finding.title}</p>
              <p className="mt-1 text-sm text-slate-700">{finding.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
