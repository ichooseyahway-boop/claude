import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";

beforeEach(() => {
  (globalThis as { __siRate?: unknown }).__siRate = undefined;
});

describe("rate limiter (PRD §16.2)", () => {
  it("allows up to the limit then blocks within the window", () => {
    const opts = { limit: 3, windowMs: 60_000 };
    expect(rateLimit("ip-a", opts).allowed).toBe(true);
    expect(rateLimit("ip-a", opts).allowed).toBe(true);
    expect(rateLimit("ip-a", opts).allowed).toBe(true);
    const blocked = rateLimit("ip-a", opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(rateLimit("ip-b", opts).allowed).toBe(true);
    expect(rateLimit("ip-b", opts).allowed).toBe(false);
    expect(rateLimit("ip-c", opts).allowed).toBe(true);
  });

  it("derives the client IP from x-forwarded-for", () => {
    const req = new Request("https://x.test", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientIp(req)).toBe("203.0.113.7");
  });
});
