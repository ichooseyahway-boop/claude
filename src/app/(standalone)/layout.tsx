import type { ReactNode } from 'react';
import '../globals.css';
import { DEFAULT_LOCALE, htmlLang } from '@/lib/i18n';

/**
 * Root layout for the routes that are deliberately not locale-prefixed:
 * `/` (which redirects) and `/status`.
 *
 * PRD 11.1 keeps `/status` at a stable URL so it can be quoted in incident
 * communications, and it renders in the default locale. That is stated here
 * rather than left implicit, because `lang` on `<html>` is what WCAG 3.1.1
 * requires and a wrong value is worse than a missing one — a screen reader will
 * confidently pronounce French with English phonemes.
 */
export default function StandaloneLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang={htmlLang(DEFAULT_LOCALE)} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
