/**
 * Billing webhook processing rules.
 *
 * PRD ref: FR-BILL-002 — verify signatures, store event IDs and reject
 * duplicates, handle delayed and out-of-order events, and alert after repeated
 * failure. Mandatory E2E scenarios 3 and 4.
 *
 * The transport (reading the body, calling the provider verifier, writing to
 * the database) lives in the route. The DECISIONS live here, so they are unit
 * testable without a provider account or a database.
 */

export const BILLING_EVENT_TYPES = [
  'payment.succeeded',
  'payment.failed',
  'refund.created',
  'dispute.created',
  'subscription.updated',
  'subscription.cancelled',
] as const;

export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

export function isHandledEventType(value: string): value is BillingEventType {
  return (BILLING_EVENT_TYPES as readonly string[]).includes(value);
}

export interface IncomingEvent {
  providerEventId: string;
  type: string;
  createdAt: Date;
}

export interface EventState {
  /** True when this provider event ID has already been processed. */
  alreadyProcessed: boolean;
  /**
   * Timestamp of the newest event already applied to the same subject.
   * Used to detect an out-of-order delivery.
   */
  latestAppliedAt: Date | null;
  /** Consecutive processing failures for this event. */
  attemptCount: number;
}

export type WebhookDecision =
  | { action: 'process' }
  | { action: 'skip_duplicate' }
  | { action: 'skip_ignored_type' }
  | { action: 'skip_stale'; reason: string }
  | { action: 'dead_letter'; reason: string };

/** After this many failures the event stops retrying and alerts operations. */
export const MAX_WEBHOOK_ATTEMPTS = 5;

/**
 * Decide what to do with an incoming, already signature-verified event.
 *
 * Order matters: duplicates are rejected before anything else, because a
 * replayed `payment.succeeded` is the exact scenario that would otherwise
 * provision a second order (mandatory E2E scenario 3).
 */
export function decideWebhookAction(
  event: IncomingEvent,
  state: EventState,
): WebhookDecision {
  if (state.alreadyProcessed) {
    return { action: 'skip_duplicate' };
  }

  if (state.attemptCount >= MAX_WEBHOOK_ATTEMPTS) {
    return {
      action: 'dead_letter',
      reason: `Event failed ${state.attemptCount} times; routed to dead letter for operator review.`,
    };
  }

  if (!isHandledEventType(event.type)) {
    return { action: 'skip_ignored_type' };
  }

  // Out-of-order delivery: an older event must not overwrite newer state.
  if (state.latestAppliedAt && event.createdAt < state.latestAppliedAt) {
    return {
      action: 'skip_stale',
      reason: 'A newer event has already been applied to this subject.',
    };
  }

  return { action: 'process' };
}

/**
 * Entitlement consequence of an event.
 *
 * PRD 6.5: "Failed payment, cancellation, refund and chargeback events must
 * update service entitlements automatically through verified webhooks."
 */
export type EntitlementEffect =
  'grant' | 'revoke' | 'suspend' | 'schedule_end' | 'none';

export function entitlementEffectFor(
  type: BillingEventType,
): EntitlementEffect {
  switch (type) {
    case 'payment.succeeded':
      return 'grant';
    // A failed payment suspends rather than revokes: 18.2 and the refund policy
    // both require that already-released reports stay readable.
    case 'payment.failed':
      return 'suspend';
    case 'refund.created':
    case 'dispute.created':
      return 'revoke';
    case 'subscription.updated':
      return 'grant';
    case 'subscription.cancelled':
      // Access continues to the end of the paid period (8.6).
      return 'schedule_end';
  }
}

/**
 * Whether an event should page the owner (21.3 billing webhook health).
 */
export function shouldAlertOperations(state: EventState): boolean {
  return state.attemptCount >= MAX_WEBHOOK_ATTEMPTS - 1;
}
