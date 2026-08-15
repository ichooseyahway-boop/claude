import { describe, it, expect, beforeAll } from "vitest";
import Stripe from "stripe";

// Configure test-mode secrets BEFORE the billing module reads them (it reads
// lazily, so setting here is sufficient).
beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy_for_signature_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy_signing_secret";
});

const WEBHOOK_SECRET = "whsec_dummy_signing_secret";

function makeEventPayload(sessionId: string): string {
  return JSON.stringify({
    id: "evt_test_1",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        payment_status: "paid",
        metadata: { offer_id: "rescue" },
        amount_total: 14900,
        currency: "usd",
        customer: "cus_test",
        payment_intent: "pi_test",
        customer_details: { email: "parent@example.com" },
      },
    },
  });
}

describe("Stripe webhook signature verification (PRD FR-COM-002)", () => {
  it("accepts a correctly-signed payload and rejects a tampered one", async () => {
    const { billing } = await import("@/lib/billing/provider");
    const stripe = new Stripe("sk_test_dummy_for_signature_test");
    const payload = makeEventPayload("cs_sig_ok");

    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    // Valid signature → parses to the expected event.
    const event = billing().parseWebhook(payload, header);
    expect(event.type).toBe("checkout.session.completed");

    // Tampered body with the same signature → must throw.
    const tampered = payload.replace("14900", "100");
    expect(() => billing().parseWebhook(tampered, header)).toThrow();

    // Missing/garbage signature → must throw.
    expect(() => billing().parseWebhook(payload, "t=1,v1=deadbeef")).toThrow();
  });

  it("normalizes a checkout session into our internal shape", async () => {
    const { billing } = await import("@/lib/billing/provider");
    const stripe = new Stripe("sk_test_dummy_for_signature_test");
    const payload = makeEventPayload("cs_norm");
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });
    const event = billing().parseWebhook(payload, header);
    const session = event.data.object as Stripe.Checkout.Session;
    const normalized = billing().normalizeSessionFromEvent(session);

    expect(normalized.paymentStatus).toBe("paid");
    expect(normalized.offerId).toBe("rescue");
    expect(normalized.customerEmail).toBe("parent@example.com");
    expect(normalized.amountTotal).toBe(14900);
  });
});
