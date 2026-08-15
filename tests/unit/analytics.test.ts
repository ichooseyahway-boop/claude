import { describe, it, expect } from "vitest";
import { isFunnelEvent, sanitizeProps } from "@/lib/analytics";

describe("analytics privacy guarantees (PRD §18.3)", () => {
  it("accepts only the closed set of funnel event names", () => {
    expect(isFunnelEvent("checkout_completed")).toBe(true);
    expect(isFunnelEvent("onboarding_started")).toBe(true);
    expect(isFunnelEvent("child_name_sam")).toBe(false);
    expect(isFunnelEvent("arbitrary")).toBe(false);
  });

  it("strips any property that is not an allowlisted, non-identifying enum", () => {
    const dirty = {
      offer: "rescue",
      step: 2,
      // These must never survive — they could carry private content.
      childName: "Sam",
      schoolName: "Riverside Elementary",
      email: "parent@example.com",
      actionTitle: "Permission slip due Friday",
      url: "https://portal.example/private",
    };
    const clean = sanitizeProps(dirty);
    expect(clean).toEqual({ offer: "rescue", step: 2 });
    expect(Object.keys(clean)).not.toContain("childName");
    expect(Object.keys(clean)).not.toContain("email");
    expect(Object.keys(clean)).not.toContain("actionTitle");
  });

  it("drops an unrecognized offer value entirely", () => {
    expect(sanitizeProps({ offer: "Riverside" })).toEqual({});
  });

  it("coerces step to an integer and ignores non-numbers", () => {
    expect(sanitizeProps({ step: 3.9 })).toEqual({ step: 3 });
    expect(sanitizeProps({ step: "two" })).toEqual({});
  });

  it("returns an empty object for junk input", () => {
    expect(sanitizeProps(null)).toEqual({});
    expect(sanitizeProps("child name here")).toEqual({});
  });
});
