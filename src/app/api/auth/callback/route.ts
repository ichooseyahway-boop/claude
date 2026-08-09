import { NextResponse, type NextRequest } from 'next/server';
import { isAuthConfigured } from '@/lib/env';
import {
  localeFromSegmentOrDefault,
  safeRedirectPath,
  signInStatusPath,
} from '@/lib/auth/sign-in';
import { anonServerClient } from '@/lib/auth/supabase';

/**
 * Magic-link callback (FR-AUTH-001).
 *
 * Exchanges the one-time code for a session cookie and sends the user on. A
 * failed exchange returns to sign-in with a neutral marker rather than an error
 * describing what went wrong, for the same non-disclosure reason as the request
 * handler.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin;
  const next = safeRedirectPath(
    request.nextUrl.searchParams.get('next'),
    '/app',
  );

  const locale = localeFromSegmentOrDefault(
    request.nextUrl.searchParams.get('locale'),
  );

  const failure = () =>
    NextResponse.redirect(
      new URL(signInStatusPath(locale, 'link_invalid'), origin),
      { headers: { 'Cache-Control': 'no-store' } },
    );

  if (!isAuthConfigured()) return failure();

  const code = request.nextUrl.searchParams.get('code');
  if (!code) return failure();

  const supabase = await anonServerClient();
  if (!supabase) return failure();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failure();

  return NextResponse.redirect(new URL(next, origin), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
