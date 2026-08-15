import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { env } from "@/lib/env";
import { getOffer, type OfferId } from "@/lib/config/offers";

/**
 * Provider-agnostic billing boundary (master-prompt rule 9). The rest of the
 * app speaks in these normalized shapes; only this module knows about Stripe.
 */

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export interface NormalizedCheckoutSession {
  id: string;
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  offerId: string;
  customerId: string | null;
  paymentIntentId: string | null;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
}

export interface BillingProvider {
  createRescueCheckout(input: {
    offerId: OfferId;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult>;

  /** Verify + parse a webhook payload. Throws if the signature is invalid. */
  parseWebhook(payload: string, signature: string): Stripe.Event;

  retrieveCheckoutSession(id: string): Promise<NormalizedCheckoutSession>;

  normalizeSessionFromEvent(
    session: Stripe.Checkout.Session,
  ): NormalizedCheckoutSession;
}

/** Resolve the Stripe price id for an offer, or throw a clear error. */
function priceIdFor(offerId: OfferId): string {
  const offer = getOffer(offerId);
  const value = process.env[offer.priceEnvVar];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `NOT_CONFIGURED: ${offer.priceEnvVar} is not set, so "${offer.name}" ` +
        `cannot be sold yet.`,
    );
  }
  return value.trim();
}

export class StripeBillingProvider implements BillingProvider {
  async createRescueCheckout({
    offerId,
    successUrl,
    cancelUrl,
  }: {
    offerId: OfferId;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult> {
    const offer = getOffer(offerId);
    if (!offer.purchasable) {
      throw new Error(`Offer "${offer.name}" is not purchasable in Release 0.`);
    }
    const session = await stripe().checkout.sessions.create({
      mode: offer.period === "monthly" ? "subscription" : "payment",
      line_items: [{ price: priceIdFor(offerId), quantity: 1 }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      // Collect email so we can send confirmation + onboarding link.
      customer_creation: offer.period === "monthly" ? undefined : "always",
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      metadata: { offer_id: offerId },
      payment_intent_data:
        offer.period === "one_time"
          ? { metadata: { offer_id: offerId } }
          : undefined,
    });
    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }
    return { id: session.id, url: session.url };
  }

  parseWebhook(payload: string, signature: string): Stripe.Event {
    return stripe().webhooks.constructEvent(
      payload,
      signature,
      env.stripeWebhookSecret(),
    );
  }

  async retrieveCheckoutSession(
    id: string,
  ): Promise<NormalizedCheckoutSession> {
    const session = await stripe().checkout.sessions.retrieve(id);
    return this.normalizeSessionFromEvent(session);
  }

  normalizeSessionFromEvent(
    session: Stripe.Checkout.Session,
  ): NormalizedCheckoutSession {
    return {
      id: session.id,
      paymentStatus: session.payment_status,
      offerId: (session.metadata?.offer_id as string | undefined) ?? "rescue",
      customerId:
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null),
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail:
        session.customer_details?.email ?? session.customer_email ?? null,
    };
  }
}

let provider: BillingProvider | null = null;
export function billing(): BillingProvider {
  if (!provider) provider = new StripeBillingProvider();
  return provider;
}
