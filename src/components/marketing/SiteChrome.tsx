import Link from 'next/link';

import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n';

import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Header, footer and the language switcher.
 *
 * Server components apart from the language switcher, which needs the current
 * pathname to satisfy FR-MKT-001's route-preserving requirement. The navigation
 * is a plain list of links, so it is keyboard-operable by default (PRD 17.1).
 * A disclosure-style mobile menu would need client state; a wrapping link list
 * does not, and reads the same to a screen reader.
 */

interface ChromeProps {
  readonly locale: Locale;
  readonly messages: Messages;
}

export function SiteHeader({ locale, messages }: ChromeProps) {
  const links = [
    { href: `/${locale}/how-it-works`, label: messages.nav.howItWorks },
    { href: `/${locale}/methodology`, label: messages.nav.methodology },
    { href: `/${locale}/pricing`, label: messages.nav.pricing },
    { href: `/${locale}/sample-report`, label: messages.nav.sampleReport },
    { href: `/${locale}/security`, label: messages.nav.security },
  ];

  return (
    <header className="border-b border-[var(--color-border)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link
          href={`/${locale}`}
          className="text-lg font-bold tracking-tight text-[var(--color-navy)]"
        >
          {messages.common.brandName}
        </Link>

        <nav aria-label={messages.nav.home} className="order-3 w-full lg:order-none lg:w-auto">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[var(--color-slate)] hover:text-[var(--color-navy)] hover:underline hover:underline-offset-4"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} label={messages.common.languageSwitcherLabel} />
          <Link
            href={`/${locale}/pricing`}
            className="rounded-md bg-[var(--color-teal)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal-700)]"
          >
            {messages.nav.startAudit}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ locale, messages }: ChromeProps) {
  const columns = [
    {
      heading: messages.footer.productHeading,
      links: [
        { href: `/${locale}/how-it-works`, label: messages.nav.howItWorks },
        { href: `/${locale}/methodology`, label: messages.nav.methodology },
        { href: `/${locale}/pricing`, label: messages.nav.pricing },
        { href: `/${locale}/sample-report`, label: messages.nav.sampleReport },
      ],
    },
    {
      heading: messages.footer.companyHeading,
      links: [
        { href: `/${locale}/about`, label: messages.nav.about },
        { href: `/${locale}/contact`, label: messages.nav.contact },
        { href: `/${locale}/security`, label: messages.nav.security },
        { href: '/status', label: messages.footer.status },
      ],
    },
    {
      heading: messages.footer.legalHeading,
      links: [
        { href: `/${locale}/legal/terms`, label: messages.footer.terms },
        { href: `/${locale}/legal/privacy`, label: messages.footer.privacy },
        { href: `/${locale}/legal/acceptable-use`, label: messages.footer.acceptableUse },
        { href: `/${locale}/legal/refunds`, label: messages.footer.refunds },
        { href: `/${locale}/legal/cookies`, label: messages.footer.cookies },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="text-base font-bold text-[var(--color-navy)]">
              {messages.common.brandName}
            </p>
            <p className="mt-2 text-sm text-[var(--color-slate)]">{messages.footer.tagline}</p>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h2 className="text-sm font-semibold text-[var(--color-navy)]">{column.heading}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[var(--color-slate)] hover:text-[var(--color-navy)] hover:underline hover:underline-offset-4"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/*
          PRD document header requires this notice to be visible until
          professional trademark, domain and corporate-name clearance is done.
        */}
        <p className="mt-10 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-slate)]">
          {messages.footer.workingNameNotice}
        </p>
        <p className="mt-2 text-xs text-[var(--color-slate)]">
          © {new Date().getFullYear()} {messages.common.brandName}.{' '}
          {messages.footer.allRightsReserved}
        </p>
      </div>
    </footer>
  );
}
