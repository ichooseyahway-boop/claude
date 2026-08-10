import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getMessages } from '@/lib/i18n';
import { isLocale } from '@/lib/i18n/config';

/**
 * Legal document routes (FR-LEGAL-002).
 *
 * FR-LEGAL-002 requires these routes to exist before launch, AND requires
 * every template to display an internal LEGAL_REVIEW_REQUIRED status until
 * Canadian counsel approves it — with the launch gate failing while that
 * status remains.
 *
 * The banner below is that status, made visible to the reader rather than
 * hidden in a database column. Publishing an unreviewed draft *as if* it were
 * approved is listed in PRD 28 as grounds for rejecting the handoff, so the
 * notice is not dismissible and is not styled as a soft aside.
 *
 * The body text is intentionally a short placeholder. Writing plausible-looking
 * terms of service would be worse than writing none: it would read as a real
 * agreement to a customer and to the owner. Counsel supplies the text; this
 * route supplies the surface, the versioning hook and the review gate.
 */

const LEGAL_DOCUMENTS = ['terms', 'privacy', 'acceptable-use', 'refunds', 'cookies'] as const;

type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

function isLegalDocument(value: string): value is LegalDocument {
  return (LEGAL_DOCUMENTS as readonly string[]).includes(value);
}

export function generateStaticParams(): { document: LegalDocument }[] {
  return LEGAL_DOCUMENTS.map((document) => ({ document }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; document: string }>;
}): Promise<Metadata> {
  const { locale, document } = await params;
  if (!isLocale(locale) || !isLegalDocument(document)) return {};

  const messages = getMessages(locale);

  return {
    title: titleFor(document, messages),
    // An unapproved draft must not be indexed and presented as authoritative.
    robots: { index: false, follow: false },
  };
}

function titleFor(document: LegalDocument, messages: ReturnType<typeof getMessages>): string {
  switch (document) {
    case 'terms':
      return messages.legal.termsTitle;
    case 'privacy':
      return messages.legal.privacyTitle;
    case 'acceptable-use':
      return messages.legal.acceptableUseTitle;
    case 'refunds':
      return messages.legal.refundsTitle;
    case 'cookies':
      return messages.legal.cookiesTitle;
  }
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ locale: string; document: string }>;
}) {
  const { locale, document } = await params;
  if (!isLocale(locale) || !isLegalDocument(document)) notFound();

  const messages = getMessages(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--color-navy)]">
        {titleFor(document, messages)}
      </h1>

      {/* FR-LEGAL-002: LEGAL_REVIEW_REQUIRED, shown to the reader. */}
      <div
        role="note"
        className="mt-8 rounded-[var(--radius-card)] border-l-4 border-[var(--color-critical)] bg-[#fdf3f2] p-6"
      >
        <p className="font-semibold text-[var(--color-critical)]">
          {messages.legal.reviewPendingTitle}
        </p>
        <p className="mt-2 text-sm text-[var(--color-slate)]">{messages.legal.reviewPendingBody}</p>
        <p className="mt-3 font-mono text-xs uppercase tracking-wide text-[var(--color-critical)]">
          LEGAL_REVIEW_REQUIRED
        </p>
      </div>

      <p className="mt-10 text-[var(--color-slate)]">
        {/*
          Deliberately not a drafted agreement. See the file header: a
          convincing placeholder is more dangerous than an obvious one.
        */}
        {locale === 'fr-CA'
          ? 'Le texte de ce document sera fourni par un conseiller juridique canadien avant le lancement. Cette page existe pour que l’adresse, la gestion des versions et le contrôle de révision soient en place dès maintenant.'
          : 'The text of this document will be supplied by Canadian counsel before launch. This page exists so the route, the version handling and the review gate are in place now.'}
      </p>
    </div>
  );
}
