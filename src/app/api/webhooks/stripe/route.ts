import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { billing } from "@/lib/billing/provider";
import { ensureOrderForCheckoutSession } from "@/lib/orders";
import { getStore } from "@/lib/database";

export const runtime = "nodejs";
// Never cache; always process the fresh raw body.
export const dynamic = "force-dynamic";

/**
 * Stripe webhook (PRD FR-COM-002/003).
 *
 * Idempotency is layered so that repeated delivery of the same event creates
 * exactly one order (§19 acceptance):
 *   1. Signature is verified against the RAW body — invalid signatures are
 *      rejected before any work.
 *   2. Processing is delegated to the order service, which is itself idempotent
 *      (unique on the checkout session id). This is the authoritative guard and
 *      also covers concurrent duplicate deliveries.
 *   3. On success, the Stripe event id is recorded so routine redeliveries are
 *      skipped. Recording happens AFTER processing so a transient failure still
 *      returns 500 and lets Stripe retry.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = billing().parseWebhook(payload, signature);
  } catch (err) {
    console.warn("[school-inbox] webhook signature verification failed", err);
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const normalized = billing().normalizeSessionFromEvent(session);
        await ensureOrderForCheckoutSession(normalized);
        break;
      }
      default:
        // Unhandled event types are acknowledged and ignored.
        break;
    }
  } catch (err) {
    console.error("[school-inbox] webhook processing error", err);
    // 500 → Stripe retries. Processing is idempotent, so retry is safe.
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  // Best-effort dedup marker for future redeliveries (after successful work).
  await getStore().markWebhookEventProcessed(event.id, event.type);

  return NextResponse.json({ received: true });
}
