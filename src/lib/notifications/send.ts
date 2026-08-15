import "server-only";
import type { Order } from "@/lib/database/types";
import { getStore } from "@/lib/database";
import { notifier } from "./provider";
import { customerConfirmationEmail, opsPaidOrderEmail } from "./templates";
import { env } from "@/lib/env";

export function onboardingUrl(order: Order): string {
  return `${env.appUrl()}/onboarding/${order.onboarding_token}`;
}

/**
 * Sends the customer confirmation exactly once per order (idempotency key
 * enforced by the store — PRD FR-NOT-004). Safe to call from both the webhook
 * and the confirmation page.
 */
export async function sendCustomerConfirmation(order: Order): Promise<void> {
  if (!order.customer_email) return;
  const store = getStore();
  const key = `customer_confirmation:${order.id}`;
  const first = await store.claimNotification(
    key,
    "customer_confirmation",
    order.customer_email,
  );
  if (!first) return;
  const msg = customerConfirmationEmail(order, onboardingUrl(order));
  try {
    await notifier().send({
      to: order.customer_email,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
  } catch (err) {
    // Don't fail the request path on email trouble; log for ops follow-up.
    console.error("[school-inbox] customer confirmation send failed", err);
  }
}

/** Notifies operations of a new paid order, exactly once. */
export async function sendOpsPaidOrder(order: Order): Promise<void> {
  const to = env.operationsEmail();
  if (!to) return;
  const store = getStore();
  const key = `ops_paid_order:${order.id}`;
  const first = await store.claimNotification(key, "ops_paid_order", to);
  if (!first) return;
  const msg = opsPaidOrderEmail(order, `${env.appUrl()}/ops`);
  try {
    await notifier().send({
      to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
  } catch (err) {
    console.error("[school-inbox] ops notification send failed", err);
  }
}
