import { NextResponse } from "next/server";
import { z } from "zod";
import { billing } from "@/lib/billing/provider";
import { env } from "@/lib/env";
import { ConfigurationError } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";
import { OFFERS } from "@/lib/config/offers";

export const runtime = "nodejs";

const BodySchema = z.object({
  offer: z.enum(["rescue"]).default("rescue"),
});

/**
 * Creates a Stripe Checkout Session for the one-time Inbox Rescue and returns
 * its hosted URL. Validates input, rate-limits by IP, and fails with a clear
 * message when Stripe is not configured (PRD FR-COM-001).
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`checkout:${ip}`, { limit: 8, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const offerId = parsed.data.offer;
  if (!OFFERS[offerId].purchasable) {
    return NextResponse.json(
      { error: "That plan isn’t available for direct checkout yet." },
      { status: 400 },
    );
  }

  try {
    const { url } = await billing().createRescueCheckout({
      offerId,
      successUrl: `${env.appUrl()}/confirmation`,
      cancelUrl: `${env.appUrl()}/get-started`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof ConfigurationError || isNotConfigured(err)) {
      return NextResponse.json(
        { error: "Checkout isn’t configured in this environment yet." },
        { status: 503 },
      );
    }
    console.error("[school-inbox] checkout error", err);
    return NextResponse.json(
      { error: "We couldn’t start checkout. Please try again." },
      { status: 500 },
    );
  }
}

function isNotConfigured(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("NOT_CONFIGURED");
}
