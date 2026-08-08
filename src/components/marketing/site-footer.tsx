import Link from 'next/link';
import { brand } from '@/config/brand';
import { footerRoutes } from '@/config/routes';
import {
  getMessages,
  interpolate,
  localizedPath,
  type Locale,
} from '@/lib/i18n';

/**
 * Public site footer.
 *
 * Carries two statements the PRD requires on every public page:
 *   - the working-name notice (brand note in the PRD preamble), and
 *   - the "not a certification" disclaimer (section 2.2, 10.10).
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const year = new Date().getUTCFullYear();

  const groups = [
    { heading: m.footer.product, routes: footerRoutes('product') },
    { heading: m.footer.company, routes: footerRoutes('company') },
    { heading: m.footer.legal, routes: footerRoutes('legal') },
  ];

  return (
    <footer className="bg-navy-50 mt-16 border-t border-[color:var(--border-subtle)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-navy-900 text-lg font-bold">{brand.name}</p>
            <p className="mt-2 text-sm">{m.footer.tagline}</p>
          </div>

          {groups.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-navy-900 text-sm font-semibold tracking-wide uppercase">
                {group.heading}
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {group.routes.map((route) => (
                  <li key={route.path}>
                    <Link
                      href={localizedPath(locale, route.path)}
                      className="underline-offset-4 hover:underline"
                    >
                      {route.label(m)}
                    </Link>
                  </li>
                ))}
                {group.heading === m.footer.company ? (
                  <li>
                    <a
                      href={`mailto:${brand.supportEmail}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {m.footer.support}
                    </a>
                  </li>
                ) : null}
                {group.heading === m.footer.product ? (
                  <li>
                    <Link
                      href="/status"
                      className="underline-offset-4 hover:underline"
                    >
                      {m.footer.status}
                    </Link>
                  </li>
                ) : null}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 space-y-3 border-t border-[color:var(--border-subtle)] pt-6 text-sm">
          <p>
            {interpolate(m.footer.notCertification, { brand: brand.name })}
          </p>
          {!brand.nameClearanceCompleted ? (
            <p>
              {interpolate(m.footer.workingNameNotice, { brand: brand.name })}
            </p>
          ) : null}
          <p>
            © {year} {brand.legalName}. {m.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
