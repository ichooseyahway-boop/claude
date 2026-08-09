import { NextResponse, type NextRequest } from 'next/server';
import { ApiErrors, newCorrelationId } from '@/lib/api/errors';
import { authRequestLimiter, clientKeyFromHeaders } from '@/lib/api/rate-limit';
import { isAuthConfigured } from '@/lib/env';
import {
  SIGN_IN_ACCEPTED,
  SignInRequestSchema,
  localeFromSegmentOrDefault,
  safeRedirectPath,
  segmentFromLocale,
} from '@/lib/auth/sign-in';
import { anonServerClient } from '@/lib/auth/supabase';

/**
 * Request a magic-link sign-in (FR-AUTH-001).
 *
 * Three properties this handler must have, in order of importance:
 *
 *  1. It never discloses whether an address belongs to an account. Every
 *     outcome after validation returns the same 202 body.
 *  2. It is rate limited per client, keyed by a salted hash rather than a
 *     stored IP address.
 *  3. It never redirects anywhere but a path on this site.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = newCorrelationId();

  if (!isAuthConfigured()) {
    return ApiErrors.notConfigured('AUTH_NOT_CONFIGURED', correlationId);
  }

  const rateKey = await clientKeyFromHeaders(request.headers, 'auth');
  const decision = await authRequestLimiter.check(rateKey);
  if (!decision.allowed) {
    return ApiErrors.rateLimited(correlationId);
  }

  const contentType = request.headers.get('content-type') ?? '';
  let raw: unknown;
  try {
    if (contentType.includes('application/json')) {
      raw = await request.json();
    } else {
      raw = Object.fromEntries(await request.formData());
    }
  } catch {
    return ApiErrors.validation(
      { email: 'A valid email address is required.' },
      correlationId,
    );
  }

  const parsed = SignInRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return ApiErrors.validation(
      { email: 'A valid email address is required.' },
      correlationId,
    );
  }

  const next = safeRedirectPath(parsed.data.next, '/app');
  const locale = localeFromSegmentOrDefault(parsed.data.locale);
  const supabase = await anonServerClient();

  if (supabase) {
    const callback = new URL('/api/auth/callback', request.nextUrl.origin);
    callback.searchParams.set('next', next);
    callback.searchParams.set('locale', segmentFromLocale(locale));

    // The result is deliberately not inspected. Branching on it — even to log
    // differently — is how "address not found" leaks through timing or logs.
    await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: callback.toString() },
    });
  }

  return NextResponse.json(SIGN_IN_ACCEPTED, {
    status: 202,
    headers: { 'Cache-Control': 'no-store' },
  });
}
