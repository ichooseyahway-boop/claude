/**
 * Centralised environment access.
 *
 * Design goals (PRD §23, master-prompt rule 7 & 12):
 *  - The marketing site renders with NO configuration at all.
 *  - Server features fail FAST with a clear, named error when a required
 *    release-specific variable is missing — never silently, never pretending.
 *  - Secrets are read only in server code. Nothing here is exported to the
 *    browser except values already prefixed `NEXT_PUBLIC_`.
 */

import "server-only";

export class ConfigurationError extends Error {
  readonly missing: string[];
  constructor(feature: string, missing: string[]) {
    super(
      `NOT_CONFIGURED: ${feature} requires ${missing.join(", ")}. ` +
        `Set them in the environment (see .env.example).`,
    );
    this.name = "ConfigurationError";
    this.missing = missing;
  }
}

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/** Require a set of variables for a named feature or throw ConfigurationError. */
export function require_<const N extends readonly string[]>(
  feature: string,
  names: N,
): { [K in N[number]]: string } {
  const out = {} as { [K in N[number]]: string };
  const missing: string[] = [];
  for (const name of names) {
    const v = read(name);
    if (v === undefined) missing.push(name);
    else (out as Record<string, string>)[name] = v;
  }
  if (missing.length > 0) throw new ConfigurationError(feature, missing);
  return out;
}

export const env = {
  appUrl(): string {
    return (
      read("NEXT_PUBLIC_APP_URL") ??
      read("VERCEL_URL")?.replace(/^/, "https://") ??
      "http://localhost:3000"
    ).replace(/\/$/, "");
  },

  // --- Stripe --------------------------------------------------------------
  stripe(): { secretKey: string } {
    const { STRIPE_SECRET_KEY } = require_("Stripe checkout", [
      "STRIPE_SECRET_KEY",
    ]);
    return { secretKey: STRIPE_SECRET_KEY };
  },
  stripeWebhookSecret(): string {
    return require_("Stripe webhook", ["STRIPE_WEBHOOK_SECRET"])
      .STRIPE_WEBHOOK_SECRET;
  },
  stripeConfigured(): boolean {
    return read("STRIPE_SECRET_KEY") !== undefined;
  },

  // --- Supabase ------------------------------------------------------------
  supabase(): { url: string; serviceRoleKey: string } {
    const vars = require_("Database (Supabase)", [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
    return {
      url: vars.SUPABASE_URL,
      serviceRoleKey: vars.SUPABASE_SERVICE_ROLE_KEY,
    };
  },
  supabaseConfigured(): boolean {
    return (
      read("SUPABASE_URL") !== undefined &&
      read("SUPABASE_SERVICE_ROLE_KEY") !== undefined
    );
  },

  // --- Email ---------------------------------------------------------------
  emailProvider(): "resend" | "postmark" | "console" {
    const p = read("EMAIL_PROVIDER")?.toLowerCase();
    if (p === "resend" || p === "postmark") return p;
    return "console";
  },
  emailProviderApiKey(): string {
    return require_("Email delivery", ["EMAIL_PROVIDER_API_KEY"])
      .EMAIL_PROVIDER_API_KEY;
  },
  emailFrom(): string {
    return (
      read("EMAIL_FROM_ADDRESS") ?? "School Inbox <hello@schoolinbox.example>"
    );
  },
  operationsEmail(): string | undefined {
    return read("OPERATIONS_NOTIFICATION_EMAIL");
  },

  // --- Operations console --------------------------------------------------
  opsAccessToken(): string | undefined {
    return read("OPS_ACCESS_TOKEN");
  },

  // --- Analytics -----------------------------------------------------------
  analyticsEnabled(): boolean {
    return read("NEXT_PUBLIC_ANALYTICS_ENABLED") === "true";
  },

  isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
