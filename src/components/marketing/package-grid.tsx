import Link from 'next/link';
import { servicePackages } from '@/config/packages';
import {
  formatCurrency,
  getMessages,
  localizedPath,
  type Locale,
} from '@/lib/i18n';

/**
 * Package summary cards.
 *
 * PRD refs: section 6 (packages), FR-MKT-002 (package summary on the homepage).
 *
 * Prices come from `src/config/packages.ts`, which holds the PRD's reference
 * amounts for display. The amount actually charged is the billing provider's
 * price record — checkout never sends an amount from the client.
 */
export function PackageGrid({
  locale,
  showAll = true,
}: {
  locale: Locale;
  showAll?: boolean;
}) {
  const m = getMessages(locale);
  const packages = showAll
    ? servicePackages
    : servicePackages.filter((p) => p.selfServeCheckout);

  return (
    <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
      {packages.map((servicePackage) => {
        const copy = m.packages[servicePackage.messageKey];
        const isQuote = servicePackage.billingType === 'quote';

        return (
          <article
            key={servicePackage.code}
            className="flex flex-col rounded-xl border border-[color:var(--border-subtle)] bg-white p-6"
          >
            <h3 className="text-xl font-semibold">{copy.name}</h3>
            <p className="mt-2">{copy.summary}</p>

            <p className="mt-4 text-2xl font-bold text-[color:var(--text-strong)]">
              {isQuote ? (
                <>
                  <span className="text-base font-normal">
                    {m.common.startingAt}{' '}
                  </span>
                  {formatCurrency(servicePackage.referenceAmountMinor, locale)}
                </>
              ) : (
                formatCurrency(servicePackage.referenceAmountMinor, locale)
              )}{' '}
              <span className="text-base font-normal">
                {servicePackage.billingType === 'recurring'
                  ? m.common.perMonth
                  : isQuote
                    ? ''
                    : m.common.oneTime}
              </span>
            </p>
            <p className="text-sm">{m.common.plusTax}</p>

            <ul className="mt-4 flex-1 list-disc space-y-1.5 pl-5 text-sm">
              {copy.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
              {copy.excluded.map((item) => (
                <li key={item} className="text-slate-500">
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={localizedPath(
                locale,
                servicePackage.selfServeCheckout ? '/pricing' : '/contact',
              )}
              className="bg-navy-900 hover:bg-navy-700 mt-6 inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold text-white"
            >
              {servicePackage.selfServeCheckout
                ? m.common.startAudit
                : m.common.contactUs}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
