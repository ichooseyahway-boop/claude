import type { Metadata, Viewport } from 'next';

import './globals.css';

/**
 * Root layout.
 *
 * The `lang` attribute is set by the locale layout underneath this one, which
 * is what PRD 17.1 means by "language of page identified". This shell exists
 * only to carry the stylesheet and the document skeleton.
 */

export const metadata: Metadata = {
  title: {
    default: 'BotAssure CX',
    template: '%s · BotAssure CX',
  },
  // FR-MKT-005: no invented metrics, no fabricated proof.
  description: 'Bilingual AI customer-experience testing and assurance for Canadian businesses.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Not `maximumScale: 1` — pinch zoom must keep working (PRD 17.1 text zoom).
  themeColor: '#0B2545',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
