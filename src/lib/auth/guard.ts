import { NextResponse } from 'next/server';
import { authorize, type Actor, type DenialCode } from '@/domain/access/actor';
import type { Permission } from '@/domain/access/permissions';
import { getDataStore } from '@/data/store';
import { getProviders } from '@/integrations/registry';
import { defaultNewId, type ServiceContext } from '@/domain/services/context';
import { ApiErrors, newCorrelationId } from '@/lib/api/errors';
import {
  resolveActor,
  readSupabaseIdentity,
  type ActorResolution,
} from './session';

/**
 * Server-side permission guards.
 *
 * PRD ref: 7.7 — "Enforce permissions server-side and at the database row
 * level. Deny by default. Never rely on hidden buttons as authorization."
 *
 * Every authenticated route handler and server component starts here. Nothing
 * downstream may assume an actor exists: the guard returns a discriminated
 * union, so forgetting to handle the denial is a compile error rather than an
 * authorization hole.
 */

export interface GuardedContext {
  actor: Actor;
  context: ServiceContext;
}

export type ApiGuardResult =
  | { ok: true; actor: Actor; context: ServiceContext }
  | { ok: false; response: NextResponse };

/** Build a request-scoped service context for an actor. */
export function serviceContextFor(
  actor: Actor | null,
  correlationId: string,
): ServiceContext {
  return {
    actor,
    data: getDataStore(),
    providers: getProviders(),
    now: () => new Date(),
    newId: defaultNewId,
    correlationId,
  };
}

const DENIAL_STATUS: Record<DenialCode, number> = {
  NOT_AUTHENTICATED: 401,
  NOT_A_MEMBER: 404,
  ROLE_NOT_PERMITTED: 403,
  MFA_REQUIRED: 403,
  REAUTH_REQUIRED: 401,
  PROJECT_OUT_OF_SCOPE: 404,
  ACCOUNT_SUSPENDED: 403,
};

/**
 * Map a failed session resolution to a response.
 *
 * `NO_ACTIVE_MEMBERSHIP` is 403 and not 404: the user is authenticated, so
 * telling them they have no access leaks nothing they do not already know.
 * Membership-scoped *resources*, by contrast, return 404 (see `DENIAL_STATUS`)
 * so that probing for organization IDs reveals nothing.
 */
function resolutionResponse(
  resolution: Extract<ActorResolution, { ok: false }>,
  correlationId: string,
): NextResponse {
  switch (resolution.reason) {
    case 'NO_SESSION':
    case 'EMAIL_NOT_VERIFIED':
      return ApiErrors.unauthorized(correlationId);
    case 'NO_PROFILE':
    case 'ACCOUNT_SUSPENDED':
    case 'NO_ACTIVE_MEMBERSHIP':
      return ApiErrors.forbidden(correlationId);
  }
}

/**
 * Require an authenticated actor for a route handler.
 *
 * Does NOT check any permission — call `requirePermission` for that. A route
 * that only calls this is asserting that being signed in is genuinely
 * sufficient, which is true for very few routes.
 */
export async function requireApiActor(
  correlationId: string = newCorrelationId(),
): Promise<ApiGuardResult> {
  let context: ServiceContext;
  try {
    context = serviceContextFor(null, correlationId);
  } catch {
    return {
      ok: false,
      response: ApiErrors.notConfigured(
        'DATA_STORE_NOT_CONFIGURED',
        correlationId,
      ),
    };
  }

  const identity = await readSupabaseIdentity();
  const resolution = await resolveActor(context.data, identity, context.now());

  if (!resolution.ok) {
    return {
      ok: false,
      response: resolutionResponse(resolution, correlationId),
    };
  }

  return {
    ok: true,
    actor: resolution.actor,
    context: { ...context, actor: resolution.actor },
  };
}

/**
 * Require a specific permission in a specific organization.
 *
 * This is the call that should appear in a route handler. It performs the
 * session resolution and the authorization decision together so that neither
 * can be done without the other.
 */
export async function requirePermission(
  organizationId: string,
  permission: Permission,
  options: { projectId?: string; correlationId?: string } = {},
): Promise<ApiGuardResult> {
  const correlationId = options.correlationId ?? newCorrelationId();
  const guarded = await requireApiActor(correlationId);
  if (!guarded.ok) return guarded;

  const decision = authorize(guarded.actor, organizationId, permission, {
    ...(options.projectId ? { projectId: options.projectId } : {}),
    now: guarded.context.now(),
  });

  if (!decision.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: decision.code,
            message: decision.message,
            correlationId,
          },
        },
        {
          status: DENIAL_STATUS[decision.code],
          headers: { 'Cache-Control': 'no-store' },
        },
      ),
    };
  }

  return guarded;
}

/**
 * Resolve the actor for a server component.
 *
 * Returns null rather than redirecting, because the caller knows which locale
 * the sign-in redirect belongs to and this module does not.
 */
export async function currentActor(): Promise<Actor | null> {
  let data;
  try {
    data = getDataStore();
  } catch {
    return null;
  }
  const identity = await readSupabaseIdentity();
  const resolution = await resolveActor(data, identity, new Date());
  return resolution.ok ? resolution.actor : null;
}
