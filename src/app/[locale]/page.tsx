import type { Metadata } from 'next';
import { PackageGrid } from '@/components/marketing/package-grid';
import {
  BulletList,
  Card,
  CardGrid,
  CtaButton,
  H2,
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
  return buildMetadata({ locale, path: '/', title: m.home.metaTitle });
}

/**
 * Homepage.
 *
 * PRD ref: FR-MKT-002 — the required conversion structure is implemented in
 * the order the PRD specifies: category statement, headline, primary and
 * secondary CTA, what is tested, three-step process, English/French
 * differentiator, human-review statement, package summary, limitations and
 * trust language, then the final call to action.
 */
export default async function HomePage({ params }: PageProps) {
  const { locale, m } = await resolvePageLocale(params);

  return (
    <>
      <section className="bg-navy-50 border-b border-[color:var(--border-subtle)]">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-teal-700 text-sm font-semibold tracking-wide uppercase">
            {m.home.eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">
            {m.home.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg">{m.home.subhead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton href={localizedPath(locale, '/pricing')}>
              {m.home.primaryCta}
            </CtaButton>
            <CtaButton
              href={localizedPath(locale, '/sample-report')}
              variant="secondary"
            >
              {m.home.secondaryCta}
            </CtaButton>
          </div>
          <p className="mt-6 text-sm font-medium">{m.home.trustLine}</p>
        </div>
      </section>

      <Section labelledBy="what-we-test">
        <H2 id="what-we-test">{m.home.whatWeTestTitle}</H2>
        <Prose>
          <p>{m.home.whatWeTestIntro}</p>
        </Prose>
        <CardGrid>
          {m.home.whatWeTest.map((item) => (
            <Card key={item.title} title={item.title}>
              <p>{item.body}</p>
            </Card>
          ))}
        </CardGrid>
      </Section>

      <Section labelledBy="process" muted>
        <H2 id="process">{m.home.processTitle}</H2>
        <ol className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {m.home.process.map((step) => (
            <li
              key={step.step}
              className="rounded-xl border border-[color:var(--border-subtle)] bg-white p-5"
            >
              <p className="text-teal-700 text-sm font-bold">{step.step}</p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="bilingual">
        <H2 id="bilingual">{m.home.bilingualTitle}</H2>
        <Prose>
          <p>{m.home.bilingualBody}</p>
        </Prose>
        <BulletList items={m.home.bilingualPoints} />
      </Section>

      <Section labelledBy="human-review" muted>
        <H2 id="human-review">{m.home.humanReviewTitle}</H2>
        <Prose>
          <p>{m.home.humanReviewBody}</p>
        </Prose>
      </Section>

      <Section labelledBy="packages">
        <H2 id="packages">{m.home.packagesTitle}</H2>
        <Prose>
          <p>{m.home.packagesIntro}</p>
        </Prose>
        <PackageGrid locale={locale} />
      </Section>

      <Section labelledBy="limitations" muted>
        <H2 id="limitations">{m.home.limitationsTitle}</H2>
        <Prose>
          <p>{m.home.limitationsIntro}</p>
        </Prose>
        <BulletList items={m.home.limitations} />
      </Section>

      <Section labelledBy="final-cta">
        <H2 id="final-cta">{m.home.finalCtaTitle}</H2>
        <Prose>
          <p>{m.home.finalCtaBody}</p>
        </Prose>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton href={localizedPath(locale, '/pricing')}>
            {m.common.startAudit}
          </CtaButton>
          <CtaButton href={localizedPath(locale, '/book')} variant="secondary">
            {m.common.bookCall}
          </CtaButton>
        </div>
        <p className="mt-6 text-sm">
          <a
            className="underline underline-offset-4"
            href={`mailto:${brand.supportEmail}`}
          >
            {brand.supportEmail}
          </a>
        </p>
      </Section>
    </>
  );
}
