import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getMessages } from '@/lib/i18n';
import { isLocale } from '@/lib/i18n/config';

/**
 * Homepage (FR-MKT-002).
 *
 * The section order is the PRD's: category statement, headline, primary and
 * secondary calls to action, what is tested, the three-step process, the
 * bilingual differentiator, the human-review statement, limitations, and a
 * final call to action.
 *
 * The limitations block is not a legal footnote tucked into the footer. PRD
 * 4.4 and FR-MKT-005 rule out overclaiming, so what the product is not gets
 * the same visual weight as what it is.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = getMessages(locale);

  return {
    title: messages.home.metaTitle,
    description: messages.home.metaDescription,
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);
  const { home } = messages;

  return (
    <>
      {/* Hero */}
      <section className="bg-[var(--color-sky)]">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-teal-700)]">
            {home.category}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-[var(--color-navy)] sm:text-5xl">
            {home.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--color-slate)]">{home.subhead}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={`/${locale}/pricing`}
              className="rounded-md bg-[var(--color-teal)] px-6 py-3 font-semibold text-white hover:bg-[var(--color-teal-700)]"
            >
              {home.primaryCta}
            </Link>
            <Link
              href={`/${locale}/sample-report`}
              className="rounded-md border border-[var(--color-navy)] px-6 py-3 font-semibold text-[var(--color-navy)] hover:bg-white"
            >
              {home.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      {/* What we test */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold tracking-tight text-[var(--color-navy)]">
          {home.whatWeTestTitle}
        </h2>
        <p className="mt-4 max-w-3xl text-[var(--color-slate)]">{home.whatWeTestIntro}</p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {home.whatWeTest.map((item) => (
            <li
              key={item.title}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6"
            >
              <h3 className="font-semibold text-[var(--color-navy)]">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-slate)]">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Process */}
      <section className="bg-[var(--color-surface-muted)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-navy)]">
            {home.processTitle}
          </h2>

          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {home.process.map((step) => (
              <li
                key={step.step}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-navy)] font-bold text-white"
                >
                  {step.step}
                </span>
                <h3 className="mt-4 font-semibold text-[var(--color-navy)]">{step.title}</h3>
                <p className="mt-2 text-sm text-[var(--color-slate)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bilingual differentiator and human review */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-navy)]">
              {home.bilingualTitle}
            </h2>
            <p className="mt-4 text-[var(--color-slate)]">{home.bilingualBody}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-navy)]">
              {home.humanReviewTitle}
            </h2>
            <p className="mt-4 text-[var(--color-slate)]">{home.humanReviewBody}</p>
          </div>
        </div>
      </section>

      {/* Limitations — deliberately prominent (PRD 4.4, 10.10, FR-MKT-005) */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-[var(--radius-card)] border-l-4 border-[var(--color-warning)] bg-[var(--color-surface-muted)] p-8">
          <h2 className="text-xl font-bold text-[var(--color-navy)]">{home.limitationsTitle}</h2>
          <p className="mt-3 max-w-4xl text-[var(--color-slate)]">{home.limitationsBody}</p>
        </div>
      </section>

      {/* Final call to action */}
      <section className="bg-[var(--color-navy)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">{home.finalCtaTitle}</h2>
          <p className="mt-4 max-w-2xl text-[var(--color-sky)]">{home.finalCtaBody}</p>
          <Link
            href={`/${locale}/pricing`}
            className="mt-8 inline-block rounded-md bg-white px-6 py-3 font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sky)]"
          >
            {home.primaryCta}
          </Link>
        </div>
      </section>
    </>
  );
}
