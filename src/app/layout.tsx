import type { ReactNode } from 'react';
import './globals.css';

/**
 * Root layout.
 *
 * The `lang` attribute is set on the locale layout, not here, because the
 * locale is not known at this level. Next.js requires a root layout with
 * <html> and <body>, so this one carries the document scaffolding only.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
