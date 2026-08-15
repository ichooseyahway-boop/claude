import { describe, it, expect } from "vitest";
import {
  OFFERS,
  getOffer,
  formatPrice,
  ADDITIONAL_CHILD_ADDON,
} from "@/lib/config/offers";

describe("offer configuration (PRD §6)", () => {
  it("prices the one-time rescue at $149 and marks it purchasable", () => {
    const rescue = getOffer("rescue");
    expect(rescue.priceUSD).toBe(149);
    expect(rescue.period).toBe("one_time");
    expect(rescue.purchasable).toBe(true);
    expect(rescue.recommended).toBe(true);
  });

  it("scopes the rescue to two children, two schools, thirty items", () => {
    const { limits } = getOffer("rescue");
    expect(limits.children).toBe(2);
    expect(limits.schools).toBe(2);
    expect(limits.sourceItems).toBe(30);
  });

  it("keeps Care and Care Plus non-purchasable until the portal ships", () => {
    expect(getOffer("care").purchasable).toBe(false);
    expect(getOffer("care_plus").purchasable).toBe(false);
  });

  it("keeps the additional-child add-on configurable, not hard-coded to 0", () => {
    expect(ADDITIONAL_CHILD_ADDON.priceUSD).toBeGreaterThan(0);
    expect(ADDITIONAL_CHILD_ADDON.priceEnvVar).toMatch(/^STRIPE_/);
  });

  it("formats one-time and monthly prices distinctly", () => {
    expect(formatPrice({ priceUSD: 149, period: "one_time" })).toBe("$149");
    expect(formatPrice({ priceUSD: 79, period: "monthly" })).toBe("$79/mo");
  });

  it("maps every offer to a Stripe price env var (no hard-coded ids)", () => {
    for (const offer of Object.values(OFFERS)) {
      expect(offer.priceEnvVar).toMatch(/^STRIPE_.*_PRICE_ID$/);
    }
  });
});
