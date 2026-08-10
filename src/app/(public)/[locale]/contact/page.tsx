import type { Metadata } from 'next';
import { ContactForm } from '@/components/marketing/contact-form';
import { PageHeader, Section } from '@/components/ui/primitives';
import { brand } from '@/config/brand';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({
    locale,
    path: '/contact',
    title: m.contact.metaTitle,
  });
}

export default async function ContactPage({ params }: PageProps) {
  const { locale, m } = await resolvePageLocale(params);

  return (
    <>
      <PageHeader title={m.contact.title} intro={m.contact.intro} />
      <Section>
        <ContactForm locale={locale} m={m} brandName={brand.name} />
      </Section>
    </>
  );
}
