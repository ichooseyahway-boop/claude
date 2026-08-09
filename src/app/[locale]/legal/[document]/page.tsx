import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Callout, PageHeader, Section } from '@/components/ui/primitives';
import { LEGAL_DOCUMENTS_REGISTER } from '@/config/legal';
import {
  LEGAL_DOCUMENTS,
  LEGAL_MESSAGE_KEY,
  isLegalDocumentSlug,
} from '@/config/routes';
import { LOCALES, formatDate, segmentFromLocale } from '@/lib/i18n';
import { resolvePageLocale } from '@/lib/i18n/server';
import { buildMetadata } from '@/lib/seo';

type PageProps = {
  params: Promise<{ locale: string; document: string }>;
};

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    LEGAL_DOCUMENTS.map((document) => ({
      locale: segmentFromLocale(locale),
      document,
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { document } = await params;
  if (!isLegalDocumentSlug(document)) notFound();
  const { locale, m } = await resolvePageLocale(
    params as Promise<{ locale: string }>,
  );
  const copy = m.legal[LEGAL_MESSAGE_KEY[document]];
  return buildMetadata({
    locale,
    path: `/legal/${document}`,
    title: copy.metaTitle,
    // Unapproved drafts must not be indexed and presented as our terms.
    noIndex: LEGAL_DOCUMENTS_REGISTER[document].approvalStatus !== 'APPROVED',
  });
}

/**
 * Legal document renderer.
 *
 * PRD ref: FR-LEGAL-002 — routes and editable content exist before launch, but
 * every template displays its review status until Canadian counsel approves it.
 */
export default async function LegalDocumentPage({ params }: PageProps) {
  const { document } = await params;
  if (!isLegalDocumentSlug(document)) notFound();

  const { locale, m } = await resolvePageLocale(
    params as Promise<{ locale: string }>,
  );
  const copy = m.legal[LEGAL_MESSAGE_KEY[document]];
  const record = LEGAL_DOCUMENTS_REGISTER[document];
  const isDraft = record.approvalStatus !== 'APPROVED';

  return (
    <>
      <PageHeader title={copy.title} intro={copy.intro} />

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {isDraft ? (
          <Callout title={m.legal.reviewBannerTitle} tone="warning">
            <p>{m.legal.reviewBannerBody}</p>
          </Callout>
        ) : null}

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="font-semibold">{m.legal.documentVersion}:</dt>
            <dd>{record.version}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold">{m.legal.effectiveDate}:</dt>
            <dd>
              {record.effectiveDate
                ? formatDate(record.effectiveDate, locale)
                : m.legal.notYetEffective}
            </dd>
          </div>
        </dl>
      </div>

      <Section>
        <div className="max-w-3xl space-y-8">
          {copy.sections.map((section, index) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold">
                {index + 1}. {section.heading}
              </h2>
              <p className="mt-2">{section.body}</p>
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}
