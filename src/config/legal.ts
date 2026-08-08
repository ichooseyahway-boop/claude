import type { LegalDocumentSlug } from './routes';

/**
 * Legal document register.
 *
 * PRD ref: FR-LEGAL-002 — "all legal templates must display an internal
 * `LEGAL_REVIEW_REQUIRED` status until Canadian counsel approves them.
 * Production launch gate fails if this status remains."
 *
 * `approvalStatus` is deliberately NOT configurable by environment variable.
 * Flipping it is a reviewed code change with a named approver and a date, so
 * that "counsel approved this" is a fact in version control rather than a
 * production toggle somebody can flick.
 */

export type LegalApprovalStatus = 'LEGAL_REVIEW_REQUIRED' | 'APPROVED';

export interface LegalDocumentRecord {
  slug: LegalDocumentSlug;
  /** Version string recorded in `consent_records` when a user accepts. */
  version: string;
  approvalStatus: LegalApprovalStatus;
  /** ISO date the version takes effect, or null while unapproved. */
  effectiveDate: string | null;
  /** Name/firm of the reviewing counsel, recorded on approval. */
  approvedBy: string | null;
}

export const LEGAL_DOCUMENTS_REGISTER: Record<
  LegalDocumentSlug,
  LegalDocumentRecord
> = {
  terms: {
    slug: 'terms',
    version: '0.1.0-draft',
    approvalStatus: 'LEGAL_REVIEW_REQUIRED',
    effectiveDate: null,
    approvedBy: null,
  },
  privacy: {
    slug: 'privacy',
    version: '0.1.0-draft',
    approvalStatus: 'LEGAL_REVIEW_REQUIRED',
    effectiveDate: null,
    approvedBy: null,
  },
  'acceptable-use': {
    slug: 'acceptable-use',
    version: '0.1.0-draft',
    approvalStatus: 'LEGAL_REVIEW_REQUIRED',
    effectiveDate: null,
    approvedBy: null,
  },
  refunds: {
    slug: 'refunds',
    version: '0.1.0-draft',
    approvalStatus: 'LEGAL_REVIEW_REQUIRED',
    effectiveDate: null,
    approvedBy: null,
  },
  cookies: {
    slug: 'cookies',
    version: '0.1.0-draft',
    approvalStatus: 'LEGAL_REVIEW_REQUIRED',
    effectiveDate: null,
    approvedBy: null,
  },
};

/**
 * Launch gate helper.
 *
 * The release checklist and the readiness endpoint both call this; a document
 * still marked LEGAL_REVIEW_REQUIRED blocks production launch.
 */
export function unapprovedLegalDocuments(): LegalDocumentRecord[] {
  return Object.values(LEGAL_DOCUMENTS_REGISTER).filter(
    (doc) => doc.approvalStatus !== 'APPROVED',
  );
}

export function allLegalDocumentsApproved(): boolean {
  return unapprovedLegalDocuments().length === 0;
}
