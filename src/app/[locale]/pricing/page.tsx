import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { PACKAGE_COPY, SERVICE_PACKAGES } from '@/domain/billing/packages';
import { formatCurrency, getMessages } from '@/lib/i18n';
import { isLocale } from '@/lib/i18n/config';

/**
 * Pricing page (FR-MKT-001, PRD 6).
 *
 * Amounts come from the package catalogue, formatted per locale. PRD 6 also
 * requires the page to state clearly whether tax is included — it is not, and
 * the note says so rather than leaving the visitor to find out at checkout.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = getMessages(locale);
  return { title: messages.pricing.metaTitle, description: messages.pricing.metaDescription };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);
  const copy = PACKAGE_COPY[locale];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--color-navy)]">
        {messages.pricing.title}
      </h1>
      <p className="mt-4 max-w-2xl text-[var(--color-slate)]">{messages.pricing.intro}</p>

      <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {[...SERVICE_PACKAGES]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((servicePackage) => {
            const packageCopy = copy[servicePackage.code];

            return (
              <section
                key={servicePackage.code}
                aria-labelledby={`package-${servicePackage.code}`}
                className={
                  servicePackage.highlight
                    ? 'flex flex-col rounded-[var(--radius-card)] border-2 border-[var(--color-teal)] bg-white p-6'
                    : 'flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6'
                }
              >
                {servicePackage.highlight ? (
                  <p className="mb-3 inline-block self-start rounded-full bg-[var(--color-sky)] px-3 py-1 text-xs font-semibold text-[var(--color-teal-700)]">
                    {messages.pricing.mostPopular}
                  </p>
                ) : null}

                <h2
                  id={`package-${servicePackage.code}`}
                  className="text-xl font-bold text-[var(--color-navy)]"
                >
                  {packageCopy.name}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-slate)]">{packageCopy.summary}</p>

                <p className="mt-6 text-3xl font-bold text-[var(--color-navy)]">
                  {servicePackage.referenceAmountCents === null
                    ? messages.pricing.customQuote
                    : formatCurrency(
                        servicePackage.referenceAmountCents,
                        locale,
                        servicePackage.currency,
                        { hideDecimalsWhenWhole: true },
                      )}
                </p>
                <p className="text-sm text-[var(--color-slate)]">
                  {servicePackage.billingType === 'subscription'
                    ? messages.pricing.perMonth
                    : servicePackage.billingType === 'one_time'
                      ? messages.pricing.oneTime
                      : ' '}
                </p>

                <h3 className="mt-6 text-sm font-semibold text-[var(--color-navy)]">
                  {messages.pricing.includedLabel}
                </h3>
                <ul className="mt-3 flex-1 space-y-2 text-sm text-[var(--color-slate)]">
                  {packageCopy.includes.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="text-[var(--color-teal)]">
                        •
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/${locale}/contact`}
                  className="mt-6 rounded-md bg-[var(--color-teal)] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--color-teal-700)]"
                >
                  {servicePackage.billingType === 'quote'
                    ? messages.pricing.contactSales
                    : messages.pricing.choosePlan}
                </Link>
              </section>
            );
          })}
      </div>

      <div className="mt-10 space-y-3 text-sm text-[var(--color-slate)]">
        <p>{messages.pricing.taxNote}</p>
        <p>{messages.pricing.turnaroundNote}</p>
      </div>
    </div>
  );
}
