import type { Metadata } from 'next';
import {
  CtaButton,
  H2,
  PageHeader,
  Prose,
  Section,
} from '@/components/ui/primitives';
import { brand } from '@/config/brand';
import { localizedPath } from '@/lib/i18n';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({ locale, path: '/about', title: m.about.metaTitle });
}

/**
 * About page.
 *
 * FR-MKT-005 (honest proof system): until real customer evidence exists this
 * page carries methodology and founder positioning only — no testimonials,
 * customer logos, review stars or usage metrics.
 */
export default async function AboutPage({ params }: PageProps) {
  const { locale, m } = await resolvePageLocale(params);

  return (
    <>
      <PageHeader title={m.about.title} intro={m.about.intro} />

      <Section labelledBy="why">
        <H2 id="why">{m.about.whyTitle}</H2>
        <Prose>
          <p>{m.about.whyBody}</p>
        </Prose>
      </Section>

      <Section labelledBy="approach" muted>
        <H2 id="approach">{m.about.approachTitle}</H2>
        <Prose>
          <p>{m.about.approachBody}</p>
        </Prose>
      </Section>

      <Section labelledBy="honesty">
        <H2 id="honesty">{m.about.honestyTitle}</H2>
        <Prose>
          <p>{m.about.honestyBody}</p>
        </Prose>
      </Section>

      <Section labelledBy="contact" muted>
        <H2 id="contact">{m.about.contactTitle}</H2>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton href={localizedPath(locale, '/contact')}>
            {m.common.contactUs}
          </CtaButton>
          <CtaButton href={`mailto:${brand.supportEmail}`} variant="secondary">
            {brand.supportEmail}
          </CtaButton>
        </div>
      </Section>
    </>
  );
}
