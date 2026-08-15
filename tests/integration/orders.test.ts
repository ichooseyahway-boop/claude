import { describe, it, expect, beforeEach } from "vitest";
import { ensureOrderForCheckoutSession } from "@/lib/orders";
import { getStore } from "@/lib/database";
import type { NormalizedCheckoutSession } from "@/lib/billing/provider";

function reset() {
  (globalThis as { __schoolInboxMem?: unknown }).__schoolInboxMem = undefined;
}

const paidSession: NormalizedCheckoutSession = {
  id: "cs_test_orders_1",
  paymentStatus: "paid",
  offerId: "rescue",
  customerId: "cus_x",
  paymentIntentId: "pi_x",
  amountTotal: 14900,
  currency: "usd",
  customerEmail: "parent@example.com",
};

describe("order service idempotency (PRD FR-COM-003/004)", () => {
  beforeEach(reset);

  it("creates exactly one order across repeated (duplicate) deliveries", async () => {
    const a = await ensureOrderForCheckoutSession(paidSession);
    const b = await ensureOrderForCheckoutSession(paidSession);

    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(a.order?.id).toBe(b.order?.id);

    const orders = await getStore().listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]!.order.status).toBe("paid");
  });

  it("does NOT create a workspace for an unpaid session (FR-COM-004)", async () => {
    const unpaid: NormalizedCheckoutSession = {
      ...paidSession,
      id: "cs_test_unpaid",
      paymentStatus: "unpaid",
    };
    const res = await ensureOrderForCheckoutSession(unpaid);
    expect(res.paid).toBe(false);
    expect(res.order).toBeNull();
    const orders = await getStore().listOrders();
    expect(orders).toHaveLength(0);
  });

  it("records an append-only audit event for order creation", async () => {
    await ensureOrderForCheckoutSession(paidSession);
    const events = await getStore().listOpsEvents();
    expect(events.some((e) => e.action === "order.created")).toBe(true);
  });
});
