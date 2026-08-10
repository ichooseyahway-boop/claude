import { redirect } from 'next/navigation';
import type { Actor } from '@/domain/access/actor';
import type { Permission } from '@/domain/access/permissions';
import { getDataStore } from '@/data/store';
import { getProviders } from '@/integrations/registry';
import {
  defaultNewId,
  permit,
  type ServiceContext,
} from '@/domain/services/context';
import { getMessages, type Messages } from '@/lib/i18n';
import { localizedPath } from '@/lib/i18n/locales';
import { newCorrelationId } from '@/lib/api/errors';
import { currentActor } from './guard';

/**
 * Page-level guards for the authenticated surfaces.
 *
 * PRD ref: 11.4 — "Route access must be enforced by server-side membership and
 * permission checks. Identifiers in URLs are not authorization."
 *
 * Every page under `/app` and `/ops` calls one of these before reading data.
 * They redirect rather than render an empty state, so an unauthenticated
 * request never reaches a component that might leak a shape.
 *
 * Language comes from the actor's profile, not the URL: these routes are not
 * locale-prefixed in the PRD's route map (11.3, 11.4), because a signed-in user
 * has a stated language preference and should not have to carry it in the path.
 */

export interface AuthenticatedPage {
  actor: Actor;
  context: ServiceContext;
  m: Messages;
}

function contextFor(actor: Actor): ServiceContext {
  return {
    actor,
    data: getDataStore(),
    providers: getProviders(),
    now: () => new Date(),
    newId: defaultNewId,
    correlationId: newCorrelationId(),
  };
}

/** Require a signed-in actor, or redirect to sign-in. */
export async function requirePage(): Promise<AuthenticatedPage> {
  const actor = await currentActor();
  if (!actor) redirect(localizedPath('en-CA', '/sign-in'));

  return {
    actor,
    context: contextFor(actor),
    m: getMessages(actor.profile.locale),
  };
}

/**
 * Require a permission in a specific organization.
 *
 * A denial redirects to the portal root rather than rendering "not allowed":
 * confirming that a particular organization or project exists is itself a
 * disclosure, and the PRD treats identifiers in URLs as non-authoritative.
 */
export async function requirePagePermission(
  organizationId: string,
  permission: Permission,
  options: { projectId?: string } = {},
): Promise<AuthenticatedPage> {
  const page = await requirePage();
  const decision = permit(page.context, organizationId, permission, options);
  if (!decision.allowed) redirect('/app');
  return page;
}

/** Organizations the actor can act in, most recently joined first. */
export function actorOrganizations(actor: Actor): string[] {
  return [...new Set(actor.memberships.map((m) => m.organizationId))];
}

/** True when the actor holds an internal role anywhere. */
export function hasInternalRole(actor: Actor): boolean {
  return actor.memberships.some((m) =>
    ['platform_owner', 'analyst', 'senior_analyst'].includes(m.role),
  );
}
