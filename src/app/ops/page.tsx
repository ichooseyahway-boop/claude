import { redirect } from 'next/navigation';
import { AppShell, EmptyState } from '@/components/app/shell';
import { hasInternalRole, requirePage } from '@/lib/auth/page-guard';
import { opsNav } from '@/lib/app-nav';
import { deliveryQueue } from '@/domain/services/operations';
import { formatDate } from '@/lib/i18n/format';
import { ScrollableTable, Td, Th } from '@/components/ui/primitives';

/**
 * Delivery queue (FR-OPS-001).
 *
 * A customer reaching `/ops` is redirected to their portal rather than shown a
 * refusal: the existence and shape of the operations workspace is not something
 * a customer needs confirmed.
 */
export default async function OpsQueuePage() {
  const { actor, context, m } = await requirePage();
  if (!hasInternalRole(actor)) redirect('/app');

  const result = await deliveryQueue(context);
  const items = result.ok ? result.value : [];

  return (
    <AppShell
      locale={actor.profile.locale}
      m={m}
      title={m.ops.queue.title}
      intro={m.ops.queue.intro}
      nav={opsNav(actor, m, context.now())}
      navLabel={m.ops.nav.label}
      userName={actor.profile.displayName}
    >
      {items.length === 0 ? (
        <EmptyState title={m.ops.queue.empty} />
      ) : (
        <ScrollableTable caption={m.ops.queue.title}>
          <thead>
            <tr>
              <Th>{m.ops.queue.organization}</Th>
              <Th>{m.ops.queue.project}</Th>
              <Th>{m.ops.queue.waitingOn}</Th>
              <Th>{m.ops.queue.due}</Th>
              <Th>{m.ops.queue.run}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.project.id}>
                <Td>{item.organizationName}</Td>
                <Td>{item.project.name}</Td>
                <Td>{m.projectStatus[item.waitingOn]}</Td>
                <Td>
                  {item.dueDate ? (
                    <span
                      className={
                        item.overdue ? 'font-semibold text-red-900' : ''
                      }
                    >
                      {formatDate(item.dueDate, actor.profile.locale)}
                      {/* Not colour alone: the word carries the meaning too. */}
                      {item.overdue ? ` — ${m.ops.queue.overdue}` : ''}
                    </span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>{item.activeRun?.state ?? m.ops.queue.noRun}</Td>
              </tr>
            ))}
          </tbody>
        </ScrollableTable>
      )}
    </AppShell>
  );
}
