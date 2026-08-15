import "server-only";
import type { NormalizedCheckoutSession } from "@/lib/billing/provider";
import type { Order } from "@/lib/database/types";
import { getStore } from "@/lib/database";
import {
  sendCustomerConfirmation,
  sendOpsPaidOrder,
} from "@/lib/notifications/send";

/**
 * The single, idempotent path from a completed checkout session to a persisted
 * order (PRD FR-COM-003/004). Called by BOTH the Stripe webhook and the
 * confirmation page, so an order is created exactly once regardless of which
 * arrives first or how many times the webhook is redelivered.
 *
 * A workspace/order is created only for a genuinely paid session.
 */
export async function ensureOrderForCheckoutSession(
  session: NormalizedCheckoutSession,
): Promise<{ order: Order | null; created: boolean; paid: boolean }> {
  const paid =
    session.paymentStatus === "paid" ||
    session.paymentStatus === "no_payment_required";

  if (!paid) {
    return { order: null, created: false, paid: false };
  }

  const store = getStore();
  const { order, created } = await store.ensureOrderForCheckout({
    offer_id: session.offerId,
    stripe_checkout_session_id: session.id,
    stripe_customer_id: session.customerId,
    stripe_payment_intent_id: session.paymentIntentId,
    amount_total: session.amountTotal,
    currency: session.currency,
    customer_email: session.customerEmail,
    status: "paid",
  });

  if (created) {
    await store.recordOpsEvent({
      actor: "system:stripe",
      action: "order.created",
      resource_type: "order",
      resource_id: order.id,
      metadata: { offer_id: order.offer_id, session: session.id },
    });
    // Fire notifications; each is independently idempotent.
    await Promise.all([
      sendCustomerConfirmation(order),
      sendOpsPaidOrder(order),
    ]);
  }

  return { order, created, paid: true };
}
