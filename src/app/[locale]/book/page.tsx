import type { Metadata } from 'next';
import { ContactForm } from '@/components/marketing/contact-form';
import {
  BulletList,
  Callout,
  H2,
  PageHeader,
  Prose,
  Section,
} from '@/components/ui/primitives';
import { brand } from '@/config/brand';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({ locale, path: '/book', title: m.book.metaTitle });
}

/**
 * Discovery call request.
 *
 * PRD ref: 24.2 (qualification questions), 24.3 (disqualifiers). Publishing the
 * disqualifiers is deliberate: section 4.4 forbids overstating the service, and
 * telling people up front when we will decline saves both sides a sales cycle.
 */
export default async function BookPage({ params }: PageProps) {
  const { locale, m } = await resolvePageLocale(params);

  return (
    <>
      <PageHeader title={m.book.title} intro={m.book.intro} />

      <Section labelledBy="agenda">
        <H2 id="agenda">{m.book.agendaTitle}</H2>
        <BulletList items={m.book.agenda} />
      </Section>

      <Section labelledBy="disqualifiers" muted>
        <H2 id="disqualifiers">{m.book.disqualifiersTitle}</H2>
        <Prose>
          <p>{m.book.disqualifiersIntro}</p>
        </Prose>
        <BulletList items={m.book.disqualifiers} />
      </Section>

      <Section labelledBy="request">
        <H2 id="request">{m.common.bookCall}</H2>
        <Callout title={m.book.formNote}>
          <p>{m.contact.responseWindow}</p>
        </Callout>
        <ContactForm locale={locale} m={m} brandName={brand.name} />
      </Section>
    </>
  );
}
