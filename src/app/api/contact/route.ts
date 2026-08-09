import { NextResponse, type NextRequest } from 'next/server';
import { ApiErrors, newCorrelationId } from '@/lib/api/errors';
import { clientKeyFromHeaders, contactFormLimiter } from '@/lib/api/rate-limit';
import {
  CONSENT_DOCUMENT_VERSION,
  ContactRequestSchema,
  containsCredentialLikeContent,
} from '@/lib/validation/contact';
import { safeLogPayload } from '@/lib/security/redaction';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 32_000;

/**
 * Public lead / discovery-call form endpoint.
 *
 * PRD refs: FR-MKT-004, FR-LEGAL-001, 13.4 (error envelope).
 *
 * IMPLEMENTATION STATUS: validation, consent capture, spam prevention and rate
 * limiting are complete. Persisting the lead and notifying the owner require a
 * configured database and email provider; until those exist the endpoint
 * accepts and validates the submission and records a safe structured log line.
 * It never pretends to have delivered an email it did not send.
 */
export async function POST(request: NextRequest) {
  const correlationId = newCorrelationId();

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return ApiErrors.validation(
      { message: 'Payload too large.' },
      correlationId,
    );
  }

  const rateKey = await clientKeyFromHeaders(request.headers, 'contact');
  const decision = await contactFormLimiter.check(rateKey);
  if (!decision.allowed) {
    return ApiErrors.rateLimited(correlationId);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return ApiErrors.validation(
      { message: 'The request body is not valid JSON.' },
      correlationId,
    );
  }

  const parsed = ContactRequestSchema.safeParse(json);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !(field in fields)) {
        // The message describes the rule, never the submitted value.
        fields[field] = issue.message;
      }
    }
    return ApiErrors.validation(fields, correlationId);
  }

  const submission = parsed.data;

  // Honeypot filled: respond as success so the bot learns nothing, and do not
  // record the submission.
  if (submission.website && submission.website.length > 0) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  // The contact page asks visitors not to send credentials. Refuse rather than
  // storing a secret in the lead table (FR-ONB-005, 16.3).
  if (
    containsCredentialLikeContent(submission.message) ||
    containsCredentialLikeContent(submission.system ?? '')
  ) {
    return ApiErrors.validation(
      {
        message:
          'Remove credentials, API keys or passwords before sending this form.',
      },
      correlationId,
    );
  }

  // Consent is recorded as two separate records so that withdrawing marketing
  // consent never withdraws the consent needed to reply (FR-LEGAL-001).
  const consentRecords = [
    {
      type: 'contact_reply' as const,
      documentVersion: CONSENT_DOCUMENT_VERSION,
      granted: submission.consent,
      source: 'public_contact_form',
      grantedAt: new Date().toISOString(),
    },
    {
      type: 'marketing' as const,
      documentVersion: CONSENT_DOCUMENT_VERSION,
      granted: submission.marketingConsent,
      source: 'public_contact_form',
      grantedAt: new Date().toISOString(),
    },
  ];

  // TODO(persistence): insert the lead and `consentRecords` once the database
  // is provisioned, then notify the owner via the email provider. Tracked in
  // PRD_TRACEABILITY.md under FR-MKT-004.
  void consentRecords;

  console.warn(
    JSON.stringify(
      safeLogPayload({
        event: 'contact.submission_received',
        correlationId,
        outcome: 'success',
        resourceType: 'public_lead',
      }),
    ),
  );

  return NextResponse.json(
    { ok: true },
    { status: 202, headers: { 'Cache-Control': 'no-store' } },
  );
}
