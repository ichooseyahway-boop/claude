import { NextResponse, type NextRequest } from 'next/server';
import { anonServerClient } from '@/lib/auth/supabase';
import {
  localeFromSegmentOrDefault,
  signInStatusPath,
} from '@/lib/auth/sign-in';

/**
 * Sign out.
 *
 * POST only. A GET sign-out is triggerable by any image tag on any page, which
 * makes it a cross-site request forgery with a small blast radius but no
 * defence — Next's Server Actions and route handlers do not add CSRF tokens to
 * GET requests because GET is supposed to be safe.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let localeSegment: string | null = null;
  try {
    const form = await request.formData();
    const value = form.get('locale');
    localeSegment = typeof value === 'string' ? value : null;
  } catch {
    // A sign-out with no body is still a valid sign-out.
  }

  const supabase = await anonServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const locale = localeFromSegmentOrDefault(localeSegment);
  return NextResponse.redirect(
    new URL(signInStatusPath(locale, 'signed_out'), request.nextUrl.origin),
    { status: 303, headers: { 'Cache-Control': 'no-store' } },
  );
}
