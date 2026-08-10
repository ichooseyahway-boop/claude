import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getMessages } from '@/lib/i18n';
import { isLocale } from '@/lib/i18n/config';

/** Security and privacy practices page (FR-MKT-001, PRD 16). */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const messages = getMessages(locale);
  return { title: messages.security.metaTitle, description: messages.security.metaDescription };
}

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);
  const { security } = messages;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--color-navy)]">
        {security.title}
      </h1>
      <p className="mt-4 text-lg text-[var(--color-slate)]">{security.intro}</p>

      <div className="mt-12 space-y-10">
        {security.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold text-[var(--color-navy)]">{section.title}</h2>
            <p className="mt-3 text-[var(--color-slate)]">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
