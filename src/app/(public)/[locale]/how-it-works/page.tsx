import type { Metadata } from 'next';
import {
  BulletList,
  Callout,
  Card,
  CardGrid,
  H2,
  PageHeader,
  Prose,
  Section,
} from '@/components/ui/primitives';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({
    locale,
    path: '/how-it-works',
    title: m.howItWorks.metaTitle,
  });
}

export default async function HowItWorksPage({ params }: PageProps) {
  const { m } = await resolvePageLocale(params);

  return (
    <>
      <PageHeader title={m.howItWorks.title} intro={m.howItWorks.intro} />

      <Section labelledBy="steps">
        <H2 id="steps">{m.howItWorks.stepsTitle}</H2>
        <ol className="mt-8 space-y-5">
          {m.howItWorks.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-[color:var(--border-subtle)] bg-white p-5"
            >
              <p className="text-teal-700 text-sm font-bold">{index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="capture" muted>
        <H2 id="capture">{m.howItWorks.captureTitle}</H2>
        <Prose>
          <p>{m.howItWorks.captureIntro}</p>
        </Prose>
        <CardGrid>
          {m.howItWorks.captureModes.map((mode) => (
            <Card key={mode.title} title={mode.title}>
              <p>{mode.body}</p>
            </Card>
          ))}
        </CardGrid>
        {/* FR-SYS-002: the browser runner is a post-launch, feature-flagged
            module. Saying so publicly keeps the marketing claim accurate. */}
        <Callout title={m.howItWorks.captureTitle} tone="warning">
          <p>{m.howItWorks.browserRunnerNote}</p>
        </Callout>
      </Section>

      <Section labelledBy="timeline">
        <H2 id="timeline">{m.howItWorks.timelineTitle}</H2>
        <Prose>
          <p>{m.howItWorks.timelineBody}</p>
        </Prose>
      </Section>

      <Section labelledBy="what-you-need" muted>
        <H2 id="what-you-need">{m.howItWorks.whatYouNeedTitle}</H2>
        <BulletList items={m.howItWorks.whatYouNeed} />
      </Section>
    </>
  );
}
