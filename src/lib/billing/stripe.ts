import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let cached: Stripe | null = null;

/** Lazily-constructed Stripe client. Throws ConfigurationError if unset. */
export function stripe(): Stripe {
  if (cached) return cached;
  const { secretKey } = env.stripe();
  cached = new Stripe(secretKey, {
    // Pin behind the SDK's default; keep the client resilient to network blips.
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: "School Inbox", version: "0.1.0" },
  });
  return cached;
}
