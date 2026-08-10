import type { Metadata } from 'next';
import {
  BulletList,
  DefinitionList,
  H2,
  PageHeader,
  Prose,
  ScrollableTable,
  Section,
  Td,
  Th,
} from '@/components/ui/primitives';
import { DEFAULT_RUBRIC, DIMENSIONS } from '@/domain/scoring/dimensions';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({
    locale,
    path: '/methodology',
    title: m.methodology.metaTitle,
  });
}

/**
 * Published methodology.
 *
 * PRD ref: section 10. The dimension table is generated from the same
 * `DEFAULT_RUBRIC` the scoring engine uses, so the published weights cannot
 * drift away from the weights that actually produce a customer's score.
 */
export default async function MethodologyPage({ params }: PageProps) {
  const { m } = await resolvePageLocale(params);

  return (
    <>
      <PageHeader title={m.methodology.title} intro={m.methodology.intro} />

      <Section labelledBy="principles">
        <H2 id="principles">{m.methodology.principlesTitle}</H2>
        <BulletList items={m.methodology.principles} />
      </Section>

      <Section labelledBy="dimensions" muted>
        <H2 id="dimensions">{m.methodology.dimensionsTitle}</H2>
        <Prose>
          <p>{m.methodology.dimensionsIntro}</p>
        </Prose>
        <ScrollableTable caption={m.methodology.dimensionsTitle}>
          <thead>
            <tr>
              <Th>{m.methodology.dimensionHeader}</Th>
              <Th>{m.methodology.weightHeader}</Th>
              <Th>{m.methodology.questionHeader}</Th>
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map((dimension) => (
              <tr key={dimension}>
                <Td>{m.dimensions[dimension].label}</Td>
                <Td>{DEFAULT_RUBRIC.weights[dimension]}</Td>
                <Td>{m.dimensions[dimension].question}</Td>
              </tr>
            ))}
          </tbody>
        </ScrollableTable>
      </Section>

      <Section labelledBy="scale">
        <H2 id="scale">{m.methodology.scaleTitle}</H2>
        <DefinitionList
          items={m.methodology.scale.map((s) => ({
            term: s.level,
            description: s.body,
          }))}
        />
      </Section>

      <Section labelledBy="calculation" muted>
        <H2 id="calculation">{m.methodology.calculationTitle}</H2>
        <Prose>
          <p>{m.methodology.calculationIntro}</p>
        </Prose>
        <pre className="mt-6 max-w-3xl overflow-x-auto rounded-lg bg-white p-4 text-sm">
          <code>{`dimension_points = (approved_dimension_score / 5) * dimension_weight
case_score = sum(dimension_points) / sum(applicable_weights) * 100
run_score  = weighted average of case scores using approved risk weights`}</code>
        </pre>
      </Section>

      <Section labelledBy="grades">
        <H2 id="grades">{m.methodology.gradesTitle}</H2>
        <DefinitionList
          items={m.methodology.grades.map((g) => ({
            term: g.band,
            description: g.body,
          }))}
        />
        <Prose>
          <p>{m.methodology.gradeNote}</p>
        </Prose>
      </Section>

      <Section labelledBy="caps" muted>
        <H2 id="caps">{m.methodology.capsTitle}</H2>
        <Prose>
          <p>{m.methodology.capsIntro}</p>
        </Prose>
        <BulletList items={m.methodology.caps} />
      </Section>

      <Section labelledBy="parity">
        <H2 id="parity">{m.methodology.parityTitle}</H2>
        <Prose>
          <p>{m.methodology.parityIntro}</p>
        </Prose>
        <pre className="mt-6 max-w-3xl overflow-x-auto rounded-lg bg-[color:var(--surface-muted)] p-4 text-sm">
          <code>{`pair_gap     = |english_case_score - french_case_score|
parity_index = 100 - weighted_average(pair_gap)`}</code>
        </pre>
        <DefinitionList
          items={m.methodology.parityBands.map((b) => ({
            term: b.band,
            description: b.body,
          }))}
        />
        <Prose>
          <p>{m.methodology.parityMinimum}</p>
        </Prose>
      </Section>

      <Section labelledBy="deterministic" muted>
        <H2 id="deterministic">{m.methodology.deterministicTitle}</H2>
        <Prose>
          <p>{m.methodology.deterministicIntro}</p>
        </Prose>
        <BulletList items={m.methodology.deterministicChecks} />
      </Section>

      <Section labelledBy="ai-role">
        <H2 id="ai-role">{m.methodology.aiRoleTitle}</H2>
        <Prose>
          <p>{m.methodology.aiRoleBody}</p>
        </Prose>
      </Section>

      <Section labelledBy="confidence" muted>
        <H2 id="confidence">{m.methodology.confidenceTitle}</H2>
        <DefinitionList
          items={m.methodology.confidence.map((c) => ({
            term: c.level,
            description: c.body,
          }))}
        />
      </Section>

      <Section labelledBy="limitations">
        <H2 id="limitations">{m.methodology.limitationsTitle}</H2>
        <Prose>
          <p>{m.methodology.limitationsIntro}</p>
        </Prose>
        <BulletList items={m.home.limitations} />
      </Section>
    </>
  );
}
