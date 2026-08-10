import Link from 'next/link';
import { AppShell, EmptyState } from '@/components/app/shell';
import { requirePage } from '@/lib/auth/page-guard';
import { portalNav } from '@/lib/app-nav';
import { listNotifications } from '@/domain/services/portal';
import { formatDateTime } from '@/lib/i18n/format';

/**
 * Notifications (FR-NOTIF-001).
 *
 * Notification bodies are stored as a message key plus parameters, never as
 * rendered prose, so a French user reads French even for a notification created
 * while an English analyst was acting (FR-I18N-001). An unknown key renders the
 * key rather than falling back to English text — a visible defect is better
 * than a silent language regression.
 */
export default async function NotificationsPage() {
  const { actor, context, m } = await requirePage();
  const result = await listNotifications(context);
  const notifications = result.ok ? result.value : [];

  return (
    <AppShell
      locale={actor.profile.locale}
      m={m}
      title={m.app.notifications.title}
      nav={portalNav(actor, m, context.now())}
      navLabel={m.app.nav.label}
      userName={actor.profile.displayName}
    >
      {notifications.length === 0 ? (
        <EmptyState title={m.app.notifications.empty} />
      ) : (
        <ul className="divide-y divide-[color:var(--border-subtle)]">
          {notifications.map((notification) => (
            <li key={notification.id} className="flex gap-4 py-4">
              <div className="flex-1">
                <p className="text-navy-900">
                  {notification.targetPath ? (
                    <Link
                      href={notification.targetPath}
                      className="underline underline-offset-4"
                    >
                      {notification.contentKey}
                    </Link>
                  ) : (
                    notification.contentKey
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(notification.createdAt, actor.profile.locale)}
                </p>
              </div>
              {notification.readAt === null ? (
                <span className="bg-navy-100 text-navy-900 h-fit rounded-full px-2 py-0.5 text-xs font-semibold">
                  {m.app.notifications.unread}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
