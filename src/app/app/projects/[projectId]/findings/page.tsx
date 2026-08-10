import { notFound } from 'next/navigation';
import { AppShell, EmptyState, SeverityBadge } from '@/components/app/shell';
import { actorOrganizations, requirePage } from '@/lib/auth/page-guard';
import { portalNav } from '@/lib/app-nav';
import { listPortalFindings } from '@/domain/services/portal';
import { formatDate } from '@/lib/i18n/format';
import type { ClientFinding } from '@/data/types';

/**
 * Project findings (FR-PORT-002).
 *
 * The list comes from `listPortalFindings`, whose return type is
 * `ClientFinding` — `internalNotes` is structurally absent, so no amount of
 * editing this component can render it.
 *
 * Only findings carried by a released report appear. A finding that exists only
 * on a draft is an unreviewed judgement no analyst has stood behind yet.
 */
export default async function ProjectFindingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { actor, context, m } = await requirePage();

  // The project identifier in the URL is not authorization (11.4). We try each
  // organization the actor belongs to and take the first that permits the read;
  // an identifier that matches nothing they can reach is simply not found.
  let findings: ClientFinding[] | null = null;
  for (const organizationId of actorOrganizations(actor)) {
    const project = await context.data.projects.findById(
      organizationId,
      projectId,
    );
    if (!project) continue;

    const result = await listPortalFindings(context, organizationId, projectId);
    if (result.ok) {
      findings = result.value;
      break;
    }
  }

  if (findings === null) notFound();

  return (
    <AppShell
      locale={actor.profile.locale}
      m={m}
      title={m.app.findings.title}
      intro={m.app.findings.intro}
      nav={portalNav(actor, m, context.now())}
      navLabel={m.app.nav.label}
      userName={actor.profile.displayName}
    >
      {findings.length === 0 ? (
        <EmptyState title={m.app.findings.empty} />
      ) : (
        <ul className="space-y-6">
          {findings.map((finding) => (
            <li
              key={finding.id}
              className="rounded-lg border border-[color:var(--border-subtle)] p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <SeverityBadge
                  severity={finding.severity}
                  label={m.severity[finding.severity]}
                />
                <span className="font-mono text-sm text-slate-600">
                  {finding.reference}
                </span>
                <span className="text-sm text-slate-600">
                  {m.app.findings.statusLabel}:{' '}
                  {m.findingStatus[finding.status]}
                </span>
              </div>

              <h2 className="text-navy-900 mt-3 text-lg font-semibold">
                {finding.title}
              </h2>
              <p className="mt-1 text-slate-700">{finding.summary}</p>

              <dl className="mt-4 space-y-3 text-sm">
                <Detail
                  term={m.app.findings.expected}
                  value={finding.expectedBehaviour}
                />
                <Detail
                  term={m.app.findings.observed}
                  value={finding.observedBehaviour}
                />
                <Detail
                  term={m.app.findings.impact}
                  value={finding.customerImpact}
                />
                <Detail
                  term={m.app.findings.remediation}
                  value={finding.recommendedRemediation}
                />
                {finding.verificationMethod ? (
                  <Detail
                    term={m.app.findings.verification}
                    value={finding.verificationMethod}
                  />
                ) : null}
                {finding.customerVisibleNotes ? (
                  <Detail term="" value={finding.customerVisibleNotes} />
                ) : null}
                {finding.status === 'risk_accepted' &&
                finding.riskReviewDate ? (
                  <Detail
                    term={m.app.findings.riskReviewDate}
                    value={formatDate(
                      finding.riskReviewDate,
                      actor.profile.locale,
                    )}
                  />
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div>
      {term ? <dt className="font-medium text-slate-600">{term}</dt> : null}
      <dd className="text-navy-900">{value}</dd>
    </div>
  );
}
