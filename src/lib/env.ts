import { z } from 'zod';

/**
 * Server environment configuration.
 *
 * PRD refs: 1.1.3 (secrets stay server-side), 1.1.12 (stop rather than
 * hard-code fake production values), 14.7 (documented configuration).
 *
 * Nothing here throws at import time. A missing integration credential must
 * make that ONE feature report "not configured" — it must not take down the
 * marketing site, and it must never fall back to a placeholder value that looks
 * like a working configuration.
 */

const ServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Database / auth
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  /** Service-role key. Server-only; never referenced from a client component. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Billing
  BILLING_SECRET_KEY: z.string().min(1).optional(),
  BILLING_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_BILLING_PUBLISHABLE_KEY: z.string().min(1).optional(),

  // Email
  EMAIL_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_REPLY_TO_ADDRESS: z.string().email().optional(),

  // AI evaluation
  AI_PROVIDER: z.enum(['anthropic', 'none']).default('none'),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),

  // Observability
  SENTRY_DSN: z.string().url().optional(),

  // Operational limits
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(20_000_000),
  EVIDENCE_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // A malformed value (e.g. a non-numeric limit) is a deployment error worth
    // failing on; a *missing* optional integration is not, and is handled by
    // the `isXConfigured` helpers below.
    throw new Error(
      `Invalid server environment configuration: ${parsed.error.issues
        .map((issue) => issue.path.join('.'))
        .join(', ')}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Test seam: clears the memoized environment. */
export function resetServerEnvCache(): void {
  cached = null;
}

export function isDatabaseConfigured(): boolean {
  const env = serverEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isAuthConfigured(): boolean {
  return isDatabaseConfigured();
}

export function isBillingConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.BILLING_SECRET_KEY && env.BILLING_WEBHOOK_SECRET);
}

export function isEmailConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.EMAIL_API_KEY && env.EMAIL_FROM_ADDRESS);
}

export function isAiConfigured(): boolean {
  const env = serverEnv();
  return env.AI_PROVIDER !== 'none' && Boolean(env.AI_API_KEY);
}

export function isProduction(): boolean {
  return serverEnv().NODE_ENV === 'production';
}
