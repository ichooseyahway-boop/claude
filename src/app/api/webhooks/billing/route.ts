import { NextResponse, type NextRequest } from 'next/server';
import {
  decideWebhookAction,
  type EventState,
} from '@/domain/billing/webhook-processing';
import { getProviders } from '@/integrations/registry';
import { ApiErrors, newCorrelationId } from '@/lib/api/errors';
import { safeLogPayload } from '@/lib/security/redaction';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Billing webhook receiver.
 *
 * PRD ref: FR-BILL-002.
 *
 * Two properties matter more than anything else here:
 *   1. The RAW body is passed to signature verification. Parsing and
 *      re-serializing would break the signature, and "it stopped verifying" is
 *      the failure mode that silently disables webhook security.
 *   2. An unverifiable payload is rejected before any other work happens.
 *
 * IMPLEMENTATION STATUS: verification and the idempotency decision are wired.
 * Recording the event and applying entitlement effects require a provisioned
 * database; that step is marked below and tracked in PRD_TRACEABILITY.md.
 */
export async function POST(request: NextRequest) {
  const correlationId = newCorrelationId();
  const billing = getProviders().billing;

  if (!billing.isConfigured()) {
    return ApiErrors.notConfigured('BILLING_NOT_CONFIGURED', correlationId);
  }

  const signature =
    request.headers.get('stripe-signature') ??
    request.headers.get('x-webhook-signature');

  if (!signature) {
    return ApiErrors.forbidden(correlationId);
  }

  const rawBody = await request.text();

  const verified = await billing.verifyWebhook(rawBody, signature);
  if (!verified.ok) {
    console.error(
      JSON.stringify(
        safeLogPayload({
          event: 'billing.webhook_rejected',
          correlationId,
          code: verified.code,
          outcome: 'denied',
        }),
      ),
    );
    // A tampered payload is never acknowledged with a 2xx.
    return ApiErrors.forbidden(correlationId);
  }

  const event = verified.value;

  // TODO(persistence): look the event up in `billing_events` to populate this
  // state. Until the database is provisioned, every event is treated as new,
  // which is safe because no entitlement is granted either. Tracked in
  // PRD_TRACEABILITY.md under FR-BILL-002.
  const state: EventState = {
    alreadyProcessed: false,
    latestAppliedAt: null,
    attemptCount: 0,
  };

  const decision = decideWebhookAction(
    {
      providerEventId: event.providerEventId,
      type: event.type,
      createdAt: event.createdAt,
    },
    state,
  );

  console.warn(
    JSON.stringify(
      safeLogPayload({
        event: 'billing.webhook_received',
        correlationId,
        code: decision.action,
        outcome: 'success',
      }),
    ),
  );

  // The provider is acknowledged with 200 for every decision except a failed
  // signature: a duplicate or ignored event is not an error, and returning a
  // non-2xx would make the provider retry it forever.
  return NextResponse.json(
    { received: true, action: decision.action },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
