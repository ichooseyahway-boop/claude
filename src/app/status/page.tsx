import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@/config/brand';
import { DEFAULT_LOCALE, getMessages, localizedPath } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Service status',
  robots: { index: true, follow: true },
};

/**
 * Status page.
 *
 * PRD ref: section 11.1 (`/status` is intentionally not locale-prefixed so the
 * URL stays stable in incident communications), 18.2 (the page distinguishes
 * application, billing, email and processing issues).
 *
 * IMPLEMENTATION STATUS: this renders the component list and the availability
 * target. It is not yet wired to real uptime data — the states shown are the
 * declared baseline, not live measurements, and the page says so rather than
 * displaying a green tick the system has not verified.
 */
export default function StatusPage() {
  const m = getMessages(DEFAULT_LOCALE);
  const components = [
    m.status.components.website,
    m.status.components.application,
    m.status.components.billing,
    m.status.components.email,
    m.status.components.processing,
  ];

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">{m.status.title}</h1>
      <p className="mt-4">{m.status.intro}</p>

      <table className="mt-8 w-full border-collapse text-left">
        <caption className="sr-only">{m.status.title}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-[color:var(--border-subtle)] py-3 font-semibold"
            >
              {m.status.componentHeader}
            </th>
            <th
              scope="col"
              className="border-b border-[color:var(--border-subtle)] py-3 font-semibold"
            >
              {m.status.stateHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {components.map((component) => (
            <tr key={component}>
              <td className="border-b border-[color:var(--border-subtle)] py-3">
                {component}
              </td>
              {/* Reported as "unknown" rather than "operational": no uptime
                  source is connected in this environment, and claiming a state
                  we have not measured would be exactly the kind of unsupported
                  assertion section 4.4 prohibits. */}
              <td className="border-b border-[color:var(--border-subtle)] py-3">
                {m.status.states.unknown}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 text-sm">{m.status.availabilityNote}</p>

      <h2 className="mt-10 text-xl font-semibold">{m.status.incidentsTitle}</h2>
      <p className="mt-2">{m.status.noIncidents}</p>

      <p className="mt-10 text-sm">
        <Link
          href={localizedPath(DEFAULT_LOCALE)}
          className="underline underline-offset-4"
        >
          {brand.name}
        </Link>
      </p>
    </main>
  );
}
