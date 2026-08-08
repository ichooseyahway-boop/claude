import { describe, expect, it, vi } from 'vitest';
import { InMemoryRateLimiter, clientKeyFromHeaders } from './rate-limit';

describe('InMemoryRateLimiter', () => {
  it('allows requests up to the limit and blocks the next one', async () => {
    const limiter = new InMemoryRateLimiter({ limit: 3, windowMs: 60_000 });

    for (let i = 0; i < 3; i += 1) {
      const decision = await limiter.check('client-a');
      expect(decision.allowed, `request ${i + 1}`).toBe(true);
    }
    expect((await limiter.check('client-a')).allowed).toBe(false);
  });

  it('tracks clients independently', async () => {
    const limiter = new InMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    expect((await limiter.check('a')).allowed).toBe(true);
    expect((await limiter.check('b')).allowed).toBe(true);
    expect((await limiter.check('a')).allowed).toBe(false);
  });

  it('resets after the window elapses', async () => {
    vi.useFakeTimers();
    try {
      const limiter = new InMemoryRateLimiter({ limit: 1, windowMs: 1_000 });
      expect((await limiter.check('a')).allowed).toBe(true);
      expect((await limiter.check('a')).allowed).toBe(false);

      vi.advanceTimersByTime(1_001);
      expect((await limiter.check('a')).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports remaining capacity', async () => {
    const limiter = new InMemoryRateLimiter({ limit: 2, windowMs: 60_000 });
    expect((await limiter.check('a')).remaining).toBe(1);
    expect((await limiter.check('a')).remaining).toBe(0);
  });
});

describe('clientKeyFromHeaders', () => {
  it('produces an opaque key that does not contain the IP address', async () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });
    const key = await clientKeyFromHeaders(headers, 'contact');
    expect(key).not.toContain('203.0.113.7');
    expect(key).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is stable for the same client and salt', async () => {
    const headers = new Headers({ 'x-real-ip': '203.0.113.7' });
    const a = await clientKeyFromHeaders(headers, 'contact');
    const b = await clientKeyFromHeaders(headers, 'contact');
    expect(a).toBe(b);
  });

  it('separates limits per salt so one form cannot exhaust another', async () => {
    const headers = new Headers({ 'x-real-ip': '203.0.113.7' });
    const contact = await clientKeyFromHeaders(headers, 'contact');
    const auth = await clientKeyFromHeaders(headers, 'auth');
    expect(contact).not.toBe(auth);
  });

  it('falls back to a shared key when no client address is present', async () => {
    const key = await clientKeyFromHeaders(new Headers(), 'contact');
    expect(key).toMatch(/^[0-9a-f]{32}$/);
  });
});
