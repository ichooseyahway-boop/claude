import type { Actor } from '@/domain/access/actor';
import { authorize } from '@/domain/access/actor';
import type { Messages } from '@/lib/i18n';
import type { NavItem } from '@/components/app/shell';

/**
 * Navigation built from permissions the server already checked.
 *
 * PRD 7.7: "Never rely on hidden buttons as authorization." Hiding a link is
 * presentation. Every destination re-checks server-side. Both are done, for
 * different reasons: the check stops the request, the hiding stops a customer
 * clicking into a wall.
 */

export function portalNav(actor: Actor, m: Messages, now: Date): NavItem[] {
  const items: NavItem[] = [
    { href: '/app', label: m.app.nav.overview },
    { href: '/app/notifications', label: m.app.nav.notifications },
  ];

  const internal = actor.memberships.some(
    (membership) =>
      authorize(actor, membership.organizationId, 'ops.view_queue', { now })
        .allowed,
  );
  if (internal) {
    items.push({ href: '/ops', label: m.app.nav.operations });
  }

  return items;
}

export function opsNav(actor: Actor, m: Messages, now: Date): NavItem[] {
  const items: NavItem[] = [{ href: '/ops', label: m.ops.nav.queue }];

  const canRelease = actor.memberships.some(
    (membership) =>
      authorize(actor, membership.organizationId, 'report.release', { now })
        .allowed,
  );
  if (canRelease) {
    items.push({ href: '/ops/release-queue', label: m.ops.nav.releaseQueue });
  }

  items.push({ href: '/app', label: m.ops.nav.backToPortal });
  return items;
}
