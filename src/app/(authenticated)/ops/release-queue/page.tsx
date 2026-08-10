import { redirect } from 'next/navigation';
import { AppShell, EmptyState } from '@/components/app/shell';
import { hasInternalRole, requirePage } from '@/lib/auth/page-guard';
import { opsNav } from '@/lib/app-nav';
import { releaseQueue } from '@/domain/services/operations';

/**
 * Release queue (FR-OPS-003).
 *
 * Every candidate shows its blockers inline. A queue that lists candidates
 * without saying why they are stuck makes the reviewer open each one to find
 * out, which is how a release gate turns into a rubber stamp: the reviewer
 * learns that clicking through is the job.
 */
export default async function ReleaseQueuePage() {
  const { actor, context, m } = await requirePage();
  if (!hasInternalRole(actor)) redirect('/app');

  const result = await releaseQueue(context);
  const items = result.ok ? result.value : [];

  return (
    <AppShell
      locale={actor.profile.locale}
      m={m}
      title={m.ops.release.title}
      intro={m.ops.release.intro}
      nav={opsNav(actor, m, context.now())}
      navLabel={m.ops.nav.label}
      userName={actor.profile.displayName}
    >
      {items.length === 0 ? (
        <EmptyState title={m.ops.release.empty} />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.report.id}
              className="rounded-lg border border-[color:var(--border-subtle)] p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-navy-900 font-semibold">
                  {item.organizationName} — {item.project.name}
                </h2>
                <span className="text-sm text-slate-600">
                  {m.ops.release.version} {item.report.version}
                </span>
              </div>

              {item.check.canRelease ? (
                <p className="mt-3 inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">
                  {m.ops.release.readyToRelease}
                </p>
              ) : (
                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-700">
                    {m.ops.release.blockedBy}: {item.check.blockers.length}{' '}
                    {m.ops.release.blockerCount}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {item.check.detail.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
