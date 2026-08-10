import type { Metadata } from 'next';
import { PackageGrid } from '@/components/marketing/package-grid';
import {
  BulletList,
  Callout,
  CtaButton,
  H2,
  PageHeader,
  Prose,
  Section,
} from '@/components/ui/primitives';
import { localizedPath } from '@/lib/i18n';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({
    locale,
    path: '/pricing',
    title: m.pricing.metaTitle,
  });
}

export default async function PricingPage({ params }: PageProps) {
  const { locale, m } = await resolvePageLocale(params);

  return (
    <>
      <PageHeader title={m.pricing.title} intro={m.pricing.intro} />

      <Section labelledBy="packages">
        <H2 id="packages">{m.pricing.includedTitle}</H2>
        <PackageGrid locale={locale} />
        <Callout title={m.pricing.taxNote}>
          <p>{m.common.plusTax}</p>
        </Callout>
      </Section>

      <Section labelledBy="policies" muted>
        <H2 id="policies">{m.pricing.policiesTitle}</H2>
        <BulletList items={m.pricing.policies} />
      </Section>

      <Section labelledBy="questions">
        <H2 id="questions">{m.pricing.questionsTitle}</H2>
        <Prose>
          <p>{m.pricing.questionsBody}</p>
        </Prose>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton href={localizedPath(locale, '/book')}>
            {m.common.bookCall}
          </CtaButton>
          <CtaButton
            href={localizedPath(locale, '/methodology')}
            variant="secondary"
          >
            {m.nav.methodology}
          </CtaButton>
        </div>
      </Section>
    </>
  );
}
