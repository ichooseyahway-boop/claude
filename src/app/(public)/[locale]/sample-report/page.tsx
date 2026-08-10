import type { Metadata } from 'next';
import {
  BulletList,
  Callout,
  Card,
  H2,
  PageHeader,
  Prose,
  ScrollableTable,
  Section,
  Td,
  Th,
} from '@/components/ui/primitives';
import { SAMPLE_REPORT, localized } from '@/data/sample-report';
import { SEVERITIES } from '@/domain/findings/findings';
import { formatDate, formatNumber } from '@/lib/i18n';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, m } = await resolvePageLocale(params);
  return buildMetadata({
    locale,
    path: '/sample-report',
    title: m.sampleReport.metaTitle,
  });
}

/**
 * Public sample report.
 *
 * PRD ref: FR-MKT-003. The synthetic marker is repeated at the top of the page,
 * in the report header and on the findings, because a screenshot of one section
 * must never be mistakable for a real customer result.
 */
export default async function SampleReportPage({ params }: PageProps) {
  const { locale, m } = await resolvePageLocale(params);
  const report = SAMPLE_REPORT;

  return (
    <>
      <PageHeader title={m.sampleReport.title} intro={m.sampleReport.intro} />

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <Callout title={m.sampleReport.syntheticBadge} tone="warning">
          <p>{m.sampleReport.intro}</p>
        </Callout>
      </div>

      <Section labelledBy="metadata">
        <H2 id="metadata">{report.reportId}</H2>
        <ScrollableTable caption={report.reportId}>
          <tbody>
            <tr>
              <Th>Customer</Th>
              <Td>{report.customerName}</Td>
            </tr>
            <tr>
              <Th>System</Th>
              <Td>
                {report.systemName} ({report.environment})
              </Td>
            </tr>
            <tr>
              <Th>Tested</Th>
              <Td>
                {formatDate(report.testedFrom, locale)} –{' '}
                {formatDate(report.testedTo, locale)}
              </Td>
            </tr>
            <tr>
              <Th>Rubric / evaluator</Th>
              <Td>
                {report.rubricVersion} · {report.evaluatorVersion}
              </Td>
            </tr>
            <tr>
              <Th>Scenarios</Th>
              <Td>
                {formatNumber(report.scenariosCompleted, locale)} /{' '}
                {formatNumber(report.scenariosPlanned, locale)}
              </Td>
            </tr>
          </tbody>
        </ScrollableTable>
      </Section>

      <Section labelledBy="score" muted>
        <H2 id="score">
          {report.finalScore} / 100 · {report.grade}
        </H2>
        {report.capApplied ? (
          <Callout title={m.methodology.capsTitle} tone="warning">
            <p>{localized(report.capApplied, locale)}</p>
            <p className="mt-2 text-sm">
              {m.methodology.calculationTitle}: {report.rawScore} →{' '}
              {report.finalScore}
            </p>
          </Callout>
        ) : null}

        <ScrollableTable caption={m.methodology.dimensionsTitle}>
          <thead>
            <tr>
              <Th>{m.methodology.dimensionHeader}</Th>
              <Th>0–5</Th>
            </tr>
          </thead>
          <tbody>
            {report.dimensionScores.map((row) => (
              <tr key={row.dimension}>
                <Td>{m.dimensions[row.dimension].label}</Td>
                <Td>{row.score.toFixed(1)}</Td>
              </tr>
            ))}
          </tbody>
        </ScrollableTable>
      </Section>

      <Section labelledBy="severity">
        <H2 id="severity">{m.sampleReport.sectionsTitle}</H2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SEVERITIES.map((severity) => (
            <Card key={severity}>
              <p className="text-sm font-semibold">{m.severity[severity]}</p>
              <p className="text-2xl font-bold text-[color:var(--text-strong)]">
                {report.severityCounts[severity]}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section labelledBy="parity" muted>
        <H2 id="parity">{m.methodology.parityTitle}</H2>
        <Prose>
          <p>
            {report.parityIndex} · {formatNumber(report.matchedPairs, locale)}{' '}
            {m.methodology.parityTitle}
          </p>
          <p>{m.methodology.parityMinimum}</p>
        </Prose>
      </Section>

      <Section labelledBy="findings">
        <H2 id="findings">{m.sampleReport.exampleFindingTitle}</H2>
        <div className="mt-8 space-y-6">
          {report.findings.map((finding) => (
            <article
              key={finding.id}
              className="rounded-xl border border-[color:var(--border-subtle)] p-5"
            >
              <p className="text-sm font-semibold tracking-wide uppercase">
                {finding.id} · {m.severity[finding.severity]} ·{' '}
                {m.dimensions[finding.dimension].label} · {finding.locale}
              </p>
              <h3 className="mt-2 text-lg font-semibold">
                {localized(finding.title, locale)}
              </h3>
              <dl className="mt-4 space-y-3 text-base">
                <div>
                  <dt className="font-semibold">Observed</dt>
                  <dd>{localized(finding.observed, locale)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Expected</dt>
                  <dd>{localized(finding.expected, locale)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Customer impact</dt>
                  <dd>{localized(finding.customerImpact, locale)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Recommended remediation</dt>
                  <dd>{localized(finding.remediation, locale)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Verification</dt>
                  <dd>{localized(finding.verification, locale)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Evidence · confidence</dt>
                  <dd>
                    {finding.evidenceRef} · {finding.confidence}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </Section>

      <Section labelledBy="sections" muted>
        <H2 id="sections">{m.sampleReport.sectionsTitle}</H2>
        <BulletList items={m.sampleReport.sections} />
        <Callout title={m.sampleReport.pdfPendingTitle}>
          <p>{m.sampleReport.pdfPendingBody}</p>
        </Callout>
      </Section>

      <Section labelledBy="limitations">
        <H2 id="limitations">{m.methodology.limitationsTitle}</H2>
        <BulletList items={m.home.limitations} />
      </Section>
    </>
  );
}
