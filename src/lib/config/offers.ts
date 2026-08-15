/**
 * Offer catalogue — the single source of truth for names, prices, limits and
 * boundaries shown across the site (PRD §6). Pricing is explicitly a
 * hypothesis; nothing about amounts, limits or the add-on price is hard-coded
 * into components. The Stripe price ID for each purchasable offer is resolved
 * server-side from the environment at checkout time (see billing/checkout.ts).
 *
 * This module is safe to import from client components — it contains no secrets.
 */

export type OfferId = "rescue" | "care" | "care_plus";
export type BillingPeriod = "one_time" | "monthly";

export interface Offer {
  id: OfferId;
  /** Stripe price env var that supplies the real price at checkout. */
  priceEnvVar: string;
  name: string;
  tagline: string;
  /** Whole-dollar amount for display. Authoritative charge comes from Stripe. */
  priceUSD: number;
  period: BillingPeriod;
  recommended?: boolean;
  /** Present tense verb for the primary button. */
  cta: string;
  limits: {
    children: number;
    schools?: number;
    sourceItems: number;
    sourceItemsWindow?: "one_time" | "per_week";
  };
  deliveryWindow?: string;
  includes: string[];
  purchasable: boolean;
}

/** Additional child/school add-on — configurable, never hard-coded (PRD §6.1). */
export const ADDITIONAL_CHILD_ADDON = {
  priceUSD: 25,
  label: "Additional child or school",
  note: "Added per rescue. Configurable pricing.",
  priceEnvVar: "STRIPE_ADDITIONAL_CHILD_PRICE_ID",
} as const;

export const OFFERS: Record<OfferId, Offer> = {
  rescue: {
    id: "rescue",
    priceEnvVar: "STRIPE_RESCUE_PRICE_ID",
    name: "Back-to-School Inbox Rescue",
    tagline: "One-time, done-for-you setup and verification.",
    priceUSD: 149,
    period: "one_time",
    recommended: true,
    cta: "Start My Inbox Rescue",
    limits: {
      children: 2,
      schools: 2,
      sourceItems: 30,
      sourceItemsWindow: "one_time",
    },
    deliveryWindow: "24–48 business hours after we receive all materials",
    includes: [
      "Private family setup",
      "Review of supplied school, camp, and activity materials",
      "A verified 60–90-day family calendar",
      "A prioritized action list",
      "Forms, payments, registrations, and RSVP links gathered in one place",
      "Bring, buy, wear, and prepare requirements",
      "Schedule-change and conflict flags",
      "Co-parent or caregiver access",
      "A Sunday Week Ahead briefing",
      "Fourteen days of follow-up reminders",
    ],
    purchasable: true,
  },
  care: {
    id: "care",
    priceEnvVar: "STRIPE_CARE_PRICE_ID",
    name: "School Inbox Care",
    tagline: "Ongoing verification and action tracking.",
    priceUSD: 79,
    period: "monthly",
    cta: "Choose Care",
    limits: { children: 2, sourceItems: 20, sourceItemsWindow: "per_week" },
    includes: [
      "Weekday digest",
      "Sunday Week Ahead briefing",
      "Calendar maintenance",
      "Outstanding-action follow-up",
      "Urgent schedule-change alerts",
      "Co-parent or caregiver delivery",
      "Human verification for consequential items",
    ],
    purchasable: false, // Subscriptions arrive with the portal in Release 1.
  },
  care_plus: {
    id: "care_plus",
    priceEnvVar: "STRIPE_CARE_PLUS_PRICE_ID",
    name: "School Inbox Care Plus",
    tagline: "More children, higher allowance, priority review.",
    priceUSD: 149,
    period: "monthly",
    cta: "Choose Care Plus",
    limits: { children: 4, sourceItems: 40, sourceItemsWindow: "per_week" },
    includes: [
      "Everything in Care",
      "Up to four children",
      "Higher message allowance",
      "Activities and camps included",
      "Priority human review",
    ],
    purchasable: false,
  },
};

export function getOffer(id: OfferId): Offer {
  return OFFERS[id];
}

export function formatPrice(offer: Pick<Offer, "priceUSD" | "period">): string {
  const dollars = `$${offer.priceUSD.toLocaleString("en-US")}`;
  return offer.period === "monthly" ? `${dollars}/mo` : dollars;
}

/** What counts as a "source item" — shown on pricing to set expectations. */
export const SOURCE_ITEM_DEFINITION =
  "A source item is one email, newsletter, PDF, screenshot, flyer, or pasted " +
  "message you send us. A forwarded thread with three replies counts as three.";
