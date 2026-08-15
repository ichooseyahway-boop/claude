import "server-only";

/**
 * Minimal fixed-window rate limiter (PRD §16.2 — rate-limit public forms and
 * sensitive endpoints). In-process only: sufficient for Release 0's basic abuse
 * protection. A shared store (e.g. Redis/Upstash) replaces this for horizontal
 * scale in a later release, behind the same function signature.
 */
interface Window {
  count: number;
  resetAt: number;
}

const g = globalThis as typeof globalThis & {
  __siRate?: Map<string, Window>;
};
function buckets(): Map<string, Window> {
  if (!g.__siRate) g.__siRate = new Map();
  return g.__siRate;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const map = buckets();
  const existing = map.get(key);
  if (!existing || existing.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
