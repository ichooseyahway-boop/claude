import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Internal operations segment (PRD 11.4). Never indexed. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OpsLayout({ children }: { children: ReactNode }) {
  return children;
}
