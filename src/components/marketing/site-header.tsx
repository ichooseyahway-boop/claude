import Link from 'next/link';
import { LanguageSwitcher } from '@/components/marketing/language-switcher';
import { brand } from '@/config/brand';
import { HEADER_ROUTES } from '@/config/routes';
import { getMessages, localizedPath, type Locale } from '@/lib/i18n';

/**
 * Public site header.
 *
 * PRD refs: FR-MKT-001 (language switching preserves the equivalent route),
 * 17.1 (keyboard operation, skip link, landmarks).
 *
 * This is a server component with no client JavaScript. The mobile navigation
 * uses a native <details> disclosure rather than a JS menu so it works with the
 * keyboard and assistive technology without a hydration dependency.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const m = getMessages(locale);

  return (
    <>
      <a href="#main" className="skip-link">
        {m.nav.skipToContent}
      </a>
      <header className="border-b border-[color:var(--border-subtle)] bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Link
            href={localizedPath(locale)}
            className="text-navy-900 text-lg font-bold"
          >
            {brand.name}
          </Link>

          <nav
            aria-label={m.nav.mainNavigation}
            className="order-3 w-full sm:order-2 sm:w-auto"
          >
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {HEADER_ROUTES.map((route) => (
                <li key={route.path}>
                  <Link
                    href={localizedPath(locale, route.path)}
                    className="hover:text-navy-900 underline-offset-4 hover:underline"
                  >
                    {route.label(m)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="order-2 ml-auto flex items-center gap-3 sm:order-3">
            <LanguageSwitcher
              locale={locale}
              label={m.meta.localeNameOther}
              ariaLabel={m.meta.switchLanguage}
            />
            <Link
              href={localizedPath(locale, '/sign-in')}
              className="text-sm font-semibold underline underline-offset-4"
            >
              {m.nav.signIn}
            </Link>
            <Link
              href={localizedPath(locale, '/pricing')}
              className="bg-navy-900 hover:bg-navy-700 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white"
            >
              {m.nav.startAudit}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
