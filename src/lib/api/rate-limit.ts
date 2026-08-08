/**
 * Rate limiting.
 *
 * PRD refs: FR-MKT-004 (spam prevention and rate limiting), 16.1, FR-AUTH-001.
 *
 * DEPLOYMENT NOTE: this in-memory limiter protects a single process only. It is
 * correct for local development and for a single-instance deployment, and it is
 * deliberately NOT sufficient for a multi-instance production deployment —
 * see ASSUMPTIONS.md. `RateLimiter` is an interface so a Redis or database
 * backed implementation can replace it without touching call sites.
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Epoch milliseconds when the current window resets. */
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitDecision>;
}

export interface RateLimitConfig {
  /** Maximum requests permitted per window. */
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly config: RateLimitConfig) {}

  async check(key: string): Promise<RateLimitDecision> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + this.config.windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      this.evictExpired(now);
      return { allowed: true, remaining: this.config.limit - 1, resetAt };
    }

    existing.count += 1;
    const allowed = existing.count <= this.config.limit;
    return {
      allowed,
      remaining: Math.max(0, this.config.limit - existing.count),
      resetAt: existing.resetAt,
    };
  }

  /** Bound memory growth: an unbounded map is its own denial-of-service. */
  private evictExpired(now: number): void {
    if (this.buckets.size < 10_000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

/** Public form submissions: 5 per 10 minutes per client key. */
export const contactFormLimiter = new InMemoryRateLimiter({
  limit: 5,
  windowMs: 10 * 60 * 1000,
});

/** Sign-in link requests: 5 per 15 minutes per client key. */
export const authRequestLimiter = new InMemoryRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
});

/**
 * Derive a rate-limit key from request headers.
 *
 * The raw IP is never stored or logged — it is hashed into an opaque key, which
 * keeps the limiter effective without adding a personal-data field to the
 * system (16.3 data minimization).
 */
export async function clientKeyFromHeaders(
  headers: Headers,
  salt: string,
): Promise<string> {
  const forwarded = headers.get('x-forwarded-for') ?? '';
  const realIp = headers.get('x-real-ip') ?? '';
  const source = (forwarded.split(',')[0] ?? '').trim() || realIp || 'unknown';

  const data = new TextEncoder().encode(`${salt}:${source}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
