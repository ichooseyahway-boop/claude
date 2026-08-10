import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * Customer portal segment.
 *
 * PRD 11.3 routes are not locale-prefixed: a signed-in user has a stated
 * language preference on their profile, so carrying it in the path would be
 * redundant and would let a link put someone in the wrong language.
 *
 * `noindex` is also set as a response header by `next.config.ts`; repeating it
 * here means a page served from a cache that dropped the header is still
 * excluded.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return children;
}
