import type { Actor } from '@/domain/access/actor';
import type { DataStore } from '@/data/repositories';
import type { Membership, Profile } from '@/data/types';

/**
 * Session resolution.
 *
 * PRD refs: FR-AUTH-001, FR-AUTH-003, 7.7 ("deny by default").
 *
 * The provider-specific part (reading the Supabase session) is deliberately
 * separated from the part that decides what that session is allowed to be. The
 * decision logic is pure and tested; only the cookie reading needs a vendor.
 */

export interface SessionIdentity {
  userId: string;
  email: string | null;
  /** When the session last actually authenticated, for step-up gating (7.7). */
  authenticatedAt: Date;
  /** Whether the provider considers the email address verified. */
  emailVerified: boolean;
}

export type ActorResolution =
  | { ok: true; actor: Actor }
  | {
      ok: false;
      reason:
        | 'NO_SESSION'
        | 'EMAIL_NOT_VERIFIED'
        | 'NO_PROFILE'
        | 'ACCOUNT_SUSPENDED'
        | 'NO_ACTIVE_MEMBERSHIP';
    };

/**
 * Decide whether a verified session becomes an actor.
 *
 * Pure so it can be tested without a Supabase project. Every rejection is a
 * distinct reason because they need different responses: a suspended account
 * should be told to contact support, an unverified email should be sent a new
 * link, and a user with no membership should see the "no access" page rather
 * than a broken dashboard.
 */
export function buildActor(
  identity: SessionIdentity,
  profile: Profile | null,
  memberships: Membership[],
  now: Date,
): ActorResolution {
  // FR-AUTH-001: "verified email required".
  if (!identity.emailVerified)
    return { ok: false, reason: 'EMAIL_NOT_VERIFIED' };
  if (!profile) return { ok: false, reason: 'NO_PROFILE' };
  if (profile.status !== 'active')
    return { ok: false, reason: 'ACCOUNT_SUSPENDED' };

  // Defence in depth: the repository filters these already, but an actor is
  // the input to every authorization decision and is not the place to trust a
  // caller's filtering.
  const active = memberships.filter(
    (m) =>
      m.userId === identity.userId &&
      m.acceptedAt !== null &&
      m.acceptedAt.getTime() <= now.getTime() &&
      m.revokedAt === null,
  );

  if (active.length === 0) return { ok: false, reason: 'NO_ACTIVE_MEMBERSHIP' };

  return {
    ok: true,
    actor: {
      userId: identity.userId,
      profile,
      memberships: active,
      authenticatedAt: identity.authenticatedAt,
    },
  };
}

/** Load the profile and memberships for an identity, then build the actor. */
export async function resolveActor(
  data: DataStore,
  identity: SessionIdentity | null,
  now: Date,
): Promise<ActorResolution> {
  if (!identity) return { ok: false, reason: 'NO_SESSION' };

  const profile = await data.profiles.findById(identity.userId);
  const memberships = await data.memberships.listActiveForUser(identity.userId);
  return buildActor(identity, profile, memberships, now);
}

/**
 * Read the Supabase session, if there is one.
 *
 * `getUser()` rather than `getSession()` on purpose: `getSession()` returns the
 * cookie contents without contacting the auth server, so a forged cookie would
 * be believed. `getUser()` validates the token.
 */
export async function readSupabaseIdentity(): Promise<SessionIdentity | null> {
  const { anonServerClient } = await import('./supabase');
  const supabase = await anonServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = data.user;
  const signedInAt =
    typeof user.last_sign_in_at === 'string'
      ? new Date(user.last_sign_in_at)
      : new Date();

  return {
    userId: user.id,
    email: user.email ?? null,
    authenticatedAt: Number.isNaN(signedInAt.getTime())
      ? new Date()
      : signedInAt,
    emailVerified:
      user.email_confirmed_at !== null && user.email_confirmed_at !== undefined,
  };
}
