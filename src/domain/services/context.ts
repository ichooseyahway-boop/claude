import type { DataStore } from '@/data/repositories';
import type { Providers } from '@/integrations/registry';
import {
  authorize,
  type Actor,
  type AuthorizationResult,
} from '@/domain/access/actor';
import type { DenialCode } from '@/domain/access/actor';
import type { Permission } from '@/domain/access/permissions';

/**
 * Service context.
 *
 * Everything a service needs is passed in: no module-level singletons, no
 * hidden clock, no ambient database handle. That is what makes the services
 * runnable against the in-memory store in tests and against PostgreSQL in
 * production without changing a line of business logic.
 */
export interface ServiceContext {
  actor: Actor | null;
  data: DataStore;
  providers: Providers;
  /** Injected clock. Never call `new Date()` inside a service. */
  now: () => Date;
  /** Injected ID generator, so tests get deterministic identifiers. */
  newId: () => string;
  correlationId: string;
}

/**
 * Authorize against the context's clock.
 *
 * Services must go through this rather than calling `authorize` directly.
 * `authorize` falls back to `new Date()` when no clock is supplied, so a direct
 * call would evaluate the step-up re-authentication window (7.7) against
 * wall-clock time while the rest of the same request used `context.now()` —
 * two clocks in one decision. Binding it here makes that impossible to forget.
 */
export function permit(
  context: ServiceContext,
  organizationId: string,
  permission: Permission,
  options: { projectId?: string } = {},
): AuthorizationResult {
  return authorize(context.actor, organizationId, permission, {
    ...options,
    now: context.now(),
  });
}

export type ServiceErrorCode =
  | DenialCode
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'VALIDATION_FAILED'
  | 'ENTITLEMENT_EXHAUSTED'
  | 'AUTHORIZATION_NOT_ACTIVE'
  | 'EXECUTION_DISABLED'
  | 'IMMUTABLE'
  | 'NOT_CONFIGURED'
  | 'CONFLICT';

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ServiceErrorCode; message: string; details?: unknown };

export function ok<T>(value: T): ServiceResult<T> {
  return { ok: true, value };
}

export function fail<T>(
  code: ServiceErrorCode,
  message: string,
  details?: unknown,
): ServiceResult<T> {
  return details === undefined
    ? { ok: false, code, message }
    : { ok: false, code, message, details };
}

/**
 * Record an audit event.
 *
 * PRD 12.6 / FR-OPS-005. Metadata is restricted to identifiers and safe
 * categories; never content.
 */
export async function audit(
  context: ServiceContext,
  entry: {
    organizationId: string | null;
    action: string;
    objectType?: string;
    objectId?: string;
    outcome: 'success' | 'denied' | 'error';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, string | number>;
  },
): Promise<void> {
  await context.data.auditEvents.record({
    actorType: context.actor ? 'user' : 'system',
    actorId: context.actor?.userId ?? null,
    organizationId: entry.organizationId,
    action: entry.action,
    objectType: entry.objectType ?? null,
    objectId: entry.objectId ?? null,
    outcome: entry.outcome,
    riskLevel: entry.riskLevel ?? 'low',
    correlationId: context.correlationId,
    metadata: entry.metadata ?? {},
  });
}

/** Deterministic-ish default ID generator for production use. */
export function defaultNewId(): string {
  return crypto.randomUUID();
}
