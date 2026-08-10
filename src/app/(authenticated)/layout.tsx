import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';
import { currentActor } from '@/lib/auth/guard';
import { DEFAULT_LOCALE, htmlLang } from '@/lib/i18n';

/**
 * Root layout for `/app` and `/ops`.
 *
 * The document language comes from the signed-in profile, not the URL: PRD 11.3
 * and 11.4 routes carry no locale segment, because a signed-in user has a
 * stated preference and a link that encoded a language could put a colleague in
 * the wrong one.
 *
 * Anonymous requests fall back to the default locale. The page guard redirects
 * them to sign-in before anything of substance renders, so the value only
 * affects how that redirect frame is announced.
 *
 * `noindex` is set here as well as in the response headers from
 * `next.config.ts`. Belt and braces: a page served from a cache that dropped
 * the header is still excluded.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Never prerender anything under here.
 *
 * Without this, Next statically renders `/app` and `/ops` at build time —
 * when there is no session — and serves that build-time output to every
 * visitor. Today that output is only a redirect, so the effect is invisible;
 * the moment a data store exists it would become one customer's page cached
 * and served to everybody. This is exactly the class of bug that does not
 * announce itself in testing.
 */
export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await currentActor();
  const locale = actor?.profile.locale ?? DEFAULT_LOCALE;

  return (
    <html lang={htmlLang(locale)} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
