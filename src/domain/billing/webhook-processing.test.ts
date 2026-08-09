import { describe, expect, it } from 'vitest';
import {
  MAX_WEBHOOK_ATTEMPTS,
  decideWebhookAction,
  entitlementEffectFor,
  isHandledEventType,
  shouldAlertOperations,
  type EventState,
  type IncomingEvent,
} from './webhook-processing';

const event: IncomingEvent = {
  providerEventId: 'evt_1',
  type: 'payment.succeeded',
  createdAt: new Date('2026-08-08T12:00:00Z'),
};

const freshState: EventState = {
  alreadyProcessed: false,
  latestAppliedAt: null,
  attemptCount: 0,
};

describe('decideWebhookAction', () => {
  it('processes a new, handled event', () => {
    expect(decideWebhookAction(event, freshState)).toEqual({
      action: 'process',
    });
  });

  it('rejects a replayed event so no duplicate order is created', () => {
    // Mandatory E2E scenario 3: "Replay the same payment webhook; confirm no
    // duplicate order/project."
    expect(
      decideWebhookAction(event, { ...freshState, alreadyProcessed: true }),
    ).toEqual({ action: 'skip_duplicate' });
  });

  it('treats a duplicate as a duplicate even after failures', () => {
    expect(
      decideWebhookAction(event, {
        alreadyProcessed: true,
        latestAppliedAt: null,
        attemptCount: MAX_WEBHOOK_ATTEMPTS + 1,
      }),
    ).toEqual({ action: 'skip_duplicate' });
  });

  it('ignores event types it does not handle', () => {
    expect(
      decideWebhookAction({ ...event, type: 'invoice.upcoming' }, freshState),
    ).toEqual({ action: 'skip_ignored_type' });
  });

  it('does not let a stale event overwrite newer state', () => {
    const result = decideWebhookAction(
      { ...event, createdAt: new Date('2026-08-08T11:00:00Z') },
      { ...freshState, latestAppliedAt: new Date('2026-08-08T12:00:00Z') },
    );
    expect(result.action).toBe('skip_stale');
  });

  it('processes an event that is newer than what has been applied', () => {
    expect(
      decideWebhookAction(event, {
        ...freshState,
        latestAppliedAt: new Date('2026-08-08T11:00:00Z'),
      }),
    ).toEqual({ action: 'process' });
  });

  it('dead-letters an event after repeated failures', () => {
    const result = decideWebhookAction(event, {
      ...freshState,
      attemptCount: MAX_WEBHOOK_ATTEMPTS,
    });
    expect(result.action).toBe('dead_letter');
  });
});

describe('entitlementEffectFor', () => {
  it('grants on successful payment', () => {
    expect(entitlementEffectFor('payment.succeeded')).toBe('grant');
  });

  it('does not grant an entitlement on a failed payment', () => {
    // Mandatory E2E scenario 4: "Payment fails; entitlement is not granted."
    expect(entitlementEffectFor('payment.failed')).not.toBe('grant');
    expect(entitlementEffectFor('payment.failed')).toBe('suspend');
  });

  it('revokes on refund and dispute', () => {
    expect(entitlementEffectFor('refund.created')).toBe('revoke');
    expect(entitlementEffectFor('dispute.created')).toBe('revoke');
  });

  it('lets a cancelled subscription run to the end of the paid period', () => {
    // Mandatory E2E scenario 13.
    expect(entitlementEffectFor('subscription.cancelled')).toBe('schedule_end');
  });
});

describe('event type guard', () => {
  it('accepts handled types and rejects others', () => {
    expect(isHandledEventType('payment.succeeded')).toBe(true);
    expect(isHandledEventType('customer.created')).toBe(false);
  });
});

describe('shouldAlertOperations', () => {
  it('alerts before the event is dead-lettered, not after', () => {
    expect(shouldAlertOperations({ ...freshState, attemptCount: 0 })).toBe(
      false,
    );
    expect(
      shouldAlertOperations({
        ...freshState,
        attemptCount: MAX_WEBHOOK_ATTEMPTS - 1,
      }),
    ).toBe(true);
  });
});
