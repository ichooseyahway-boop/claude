import { describe, it, expect } from "vitest";
import { completeSchema, saveDraftSchema } from "@/lib/onboarding/schema";

describe("onboarding validation (PRD FR-ONB-001..003)", () => {
  it("accepts a partial draft for save-and-resume", () => {
    const res = saveDraftSchema.safeParse({
      step: 1,
      data: { account_name: "Alex" },
    });
    expect(res.success).toBe(true);
  });

  it("allows a child identified only by initials (no legal name required)", () => {
    const res = completeSchema.safeParse({
      data: {
        account_name: "Alex Rivera",
        email: "alex@example.com",
        timezone: "America/Toronto",
        children: [{ display_name: "R." }],
        consent: { terms: true, privacy: true, prohibited: true },
      },
    });
    expect(res.success).toBe(true);
  });

  it("supports two children (Release 0 acceptance criterion)", () => {
    const res = completeSchema.safeParse({
      data: {
        account_name: "Alex Rivera",
        email: "alex@example.com",
        timezone: "America/Toronto",
        children: [
          { display_name: "R.", school_label: "Riverside", grade_label: "4" },
          { display_name: "Sam", school_label: "Riverside", grade_label: "1" },
        ],
        consent: { terms: true, privacy: true, prohibited: true },
      },
    });
    expect(res.success).toBe(true);
  });

  it("rejects completion without all three consents", () => {
    const res = completeSchema.safeParse({
      data: {
        account_name: "Alex",
        email: "alex@example.com",
        timezone: "America/Toronto",
        children: [{ display_name: "R." }],
        consent: { terms: true, privacy: false, prohibited: true },
      },
    });
    expect(res.success).toBe(false);
  });

  it("rejects completion with an invalid email", () => {
    const res = completeSchema.safeParse({
      data: {
        account_name: "Alex",
        email: "not-an-email",
        timezone: "America/Toronto",
        children: [{ display_name: "R." }],
        consent: { terms: true, privacy: true, prohibited: true },
      },
    });
    expect(res.success).toBe(false);
  });

  it("rejects completion with zero children", () => {
    const res = completeSchema.safeParse({
      data: {
        account_name: "Alex",
        email: "alex@example.com",
        timezone: "America/Toronto",
        children: [],
        consent: { terms: true, privacy: true, prohibited: true },
      },
    });
    expect(res.success).toBe(false);
  });
});
