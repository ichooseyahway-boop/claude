import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "@/lib/database/memory-store";
import type { EnsureOrderInput } from "@/lib/database/store";

function resetGlobal() {
  (globalThis as { __schoolInboxMem?: unknown }).__schoolInboxMem = undefined;
}

const baseInput: EnsureOrderInput = {
  offer_id: "rescue",
  stripe_checkout_session_id: "cs_test_123",
  stripe_customer_id: "cus_1",
  stripe_payment_intent_id: "pi_1",
  amount_total: 14900,
  currency: "usd",
  customer_email: "parent@example.com",
  status: "paid",
};

describe("MemoryStore idempotency (PRD FR-COM-003, §19)", () => {
  beforeEach(resetGlobal);

  it("creates exactly one order for repeated deliveries of one session", async () => {
    const store = new MemoryStore();
    const first = await store.ensureOrderForCheckout(baseInput);
    const second = await store.ensureOrderForCheckout(baseInput);
    const third = await store.ensureOrderForCheckout(baseInput);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(third.created).toBe(false);
    expect(second.order.id).toBe(first.order.id);

    const all = await store.listOrders();
    expect(all).toHaveLength(1);
  });

  it("dedupes webhook event ids", async () => {
    const store = new MemoryStore();
    expect(await store.markWebhookEventProcessed("evt_1", "x")).toBe(true);
    expect(await store.markWebhookEventProcessed("evt_1", "x")).toBe(false);
    expect(await store.markWebhookEventProcessed("evt_2", "x")).toBe(true);
  });

  it("dedupes notification idempotency keys", async () => {
    const store = new MemoryStore();
    expect(await store.claimNotification("k1", "confirm", "a@b.com")).toBe(
      true,
    );
    expect(await store.claimNotification("k1", "confirm", "a@b.com")).toBe(
      false,
    );
  });

  it("issues an unguessable onboarding token per order", async () => {
    const store = new MemoryStore();
    const { order } = await store.ensureOrderForCheckout(baseInput);
    expect(order.onboarding_token.length).toBeGreaterThanOrEqual(24);
    const found = await store.getOrderByToken(order.onboarding_token);
    expect(found?.id).toBe(order.id);
  });

  it("materializes a family with two children and is idempotent on completion", async () => {
    const store = new MemoryStore();
    const { order } = await store.ensureOrderForCheckout(baseInput);
    const data = {
      account_name: "Alex Rivera",
      email: "alex@example.com",
      timezone: "America/Toronto",
      children: [{ display_name: "R." }, { display_name: "Sam" }],
      consent: {
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
        prohibited_ack_at: new Date().toISOString(),
      },
    };
    const done = await store.completeOnboarding(order.onboarding_token, data);
    expect(done.children).toHaveLength(2);
    expect(done.family.name).toBe("Alex Rivera");

    // Second completion must not create a duplicate family/children.
    const again = await store.completeOnboarding(order.onboarding_token, data);
    expect(again.family.id).toBe(done.family.id);
    expect(again.children).toHaveLength(2);

    const updated = await store.getOrderByToken(order.onboarding_token);
    expect(updated?.onboarding_status).toBe("completed");
  });

  it("does not store card data on the order", async () => {
    const store = new MemoryStore();
    const { order } = await store.ensureOrderForCheckout(baseInput);
    const serialized = JSON.stringify(order);
    expect(serialized).not.toMatch(/card|pan|cvc|cvv/i);
    // Only Stripe references are retained.
    expect(order.stripe_customer_id).toBe("cus_1");
  });
});
