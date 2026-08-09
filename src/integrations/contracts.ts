import type { Locale } from '@/lib/i18n';

/**
 * Provider contracts.
 *
 * PRD ref: 14.3 — "Business logic depends on interfaces, not vendor SDKs spread
 * throughout the codebase", and 5.3: "No vendor must be so deeply embedded that
 * changing billing, database, email or AI provider would require a full
 * rewrite."
 *
 * Every method returns a result object rather than throwing on expected
 * failure, so a caller must handle the unconfigured and failure cases
 * explicitly instead of relying on an exception it may not catch.
 */

export type ProviderResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ProviderErrorCode; message: string };

export type ProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_REQUEST'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'SIGNATURE_INVALID';

export function notConfigured<T>(provider: string): ProviderResult<T> {
  return {
    ok: false,
    code: 'NOT_CONFIGURED',
    message: `The ${provider} provider is not configured in this environment.`,
  };
}

// ---------------------------------------------------------------------------
// Billing (FR-BILL-001..005)
// ---------------------------------------------------------------------------

export interface CheckoutSessionRequest {
  packageCode: string;
  providerPriceId: string;
  quantity: number;
  /** Signed server-side metadata linking the session to a pending order. */
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  locale: Locale;
  /** Required: prevents a double-click creating two orders (13.5). */
  idempotencyKey: string;
}

export interface CheckoutSession {
  providerSessionId: string;
  redirectUrl: string;
}

export interface BillingPortalRequest {
  providerCustomerId: string;
  returnUrl: string;
  locale: Locale;
}

/** A verified webhook event, after signature validation. */
export interface VerifiedBillingEvent {
  providerEventId: string;
  type: string;
  /** Provider object ID the event refers to. */
  objectId: string | null;
  metadata: Record<string, string>;
  createdAt: Date;
}

export interface BillingProvider {
  readonly name: string;
  isConfigured(): boolean;
  createCheckoutSession(
    request: CheckoutSessionRequest,
  ): Promise<ProviderResult<CheckoutSession>>;
  createPortalSession(
    request: BillingPortalRequest,
  ): Promise<ProviderResult<{ redirectUrl: string }>>;
  /**
   * Verify a webhook signature and parse the event.
   *
   * FR-BILL-002. Takes the RAW body: a parsed and re-serialized body will not
   * match the signature, which is the most common way webhook verification is
   * accidentally disabled.
   */
  verifyWebhook(
    rawBody: string,
    signatureHeader: string,
  ): Promise<ProviderResult<VerifiedBillingEvent>>;
  /** Record a refund through an authorized provider action (FR-BILL-005). */
  refund(
    providerPaymentId: string,
    amountMinor: number | null,
    reason: string,
    idempotencyKey: string,
  ): Promise<ProviderResult<{ providerRefundId: string }>>;
}

// ---------------------------------------------------------------------------
// Email (FR-NOT-001, FR-NOT-002)
// ---------------------------------------------------------------------------

export type EmailTemplateKey =
  | 'payment_receipt'
  | 'account_activation'
  | 'onboarding_reminder'
  | 'changes_requested'
  | 'scope_approved'
  | 'audit_started'
  | 'customer_action_required'
  | 'report_released'
  | 'retest_result'
  | 'subscription_payment_failed'
  | 'subscription_cancelled'
  | 'data_request_received'
  | 'data_request_completed'
  | 'security_account_event';

export interface EmailMessage {
  to: string;
  template: EmailTemplateKey;
  locale: Locale;
  /**
   * Safe template parameters only.
   *
   * FR-NOT-002 forbids secrets, full transcripts, detailed critical evidence
   * and sensitive documents in email. Parameters are identifiers, names and
   * links to the authenticated portal — never audit content.
   */
  params: Record<string, string>;
  replyTo?: string;
}

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(message: EmailMessage): Promise<ProviderResult<{ messageId: string }>>;
}

// ---------------------------------------------------------------------------
// AI evaluation (section 15)
// ---------------------------------------------------------------------------

export interface EvaluationRequest {
  /** Scenario objective, expected facts, response, rubric — nothing else. */
  scenarioObjective: string;
  expectedFacts: string[];
  disallowedOutcomes: string[];
  /** The captured response. ALWAYS treated as untrusted data (15.3). */
  capturedResponse: string;
  conversationContext: Array<{ role: 'tester' | 'system'; content: string }>;
  redactedPolicyExcerpts: Array<{
    sourceId: string;
    excerptId: string;
    text: string;
  }>;
  locale: Locale;
  rubricVersion: string;
  promptVersion: string;
  /** Hard ceiling on spend for this call (6.6). */
  maxOutputTokens: number;
}

export interface EvaluationProposal {
  schemaVersion: string;
  scores: Array<{
    dimension: string;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    rationale: string;
    responseEvidence: Array<{ turn: number; start: number; end: number }>;
    policyEvidence: Array<{ sourceId: string; excerptId: string }>;
  }>;
  candidateFindings: Array<{
    title: string;
    severity: string;
    observed: string;
    expected: string;
    customerImpact: string;
    remediation: string;
  }>;
  uncertainties: string[];
}

export interface EvaluationResponse {
  proposal: EvaluationProposal;
  modelIdentifier: string;
  costMinor: number;
  latencyMs: number;
  retries: number;
}

export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  /**
   * Produce a structured evaluation proposal.
   *
   * The proposal is NEVER client-visible and never final: an analyst reviews
   * every dimension before anything reaches a report (FR-EVAL-001).
   */
  evaluate(
    request: EvaluationRequest,
  ): Promise<ProviderResult<EvaluationResponse>>;
}

// ---------------------------------------------------------------------------
// Storage (FR-ONB-004, FR-RUN-005)
// ---------------------------------------------------------------------------

export interface FileStorageProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Short-lived, tenant-scoped upload URL. */
  createUploadUrl(
    key: string,
    contentType: string,
    maxBytes: number,
  ): Promise<ProviderResult<{ url: string; expiresAt: Date }>>;
  /** Short-lived download URL. FR-RPT-002 logs the access separately. */
  createDownloadUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<ProviderResult<{ url: string; expiresAt: Date }>>;
  delete(key: string): Promise<ProviderResult<{ deleted: boolean }>>;
}

// ---------------------------------------------------------------------------
// Job queue (14.2)
// ---------------------------------------------------------------------------

export type JobKind =
  | 'run_execute'
  | 'case_evaluate'
  | 'report_render'
  | 'retention_sweep'
  | 'email_send';

export interface JobEnvelope {
  kind: JobKind;
  /** Identifiers only — job payloads never carry audit content. */
  payload: Record<string, string>;
  /** Deduplicates a retried submission (13.5). */
  idempotencyKey: string;
  maxAttempts: number;
}

export interface JobQueue {
  readonly name: string;
  isConfigured(): boolean;
  enqueue(job: JobEnvelope): Promise<ProviderResult<{ jobId: string }>>;
  /** Depth and dead-letter counts for the operations dashboard (21.3). */
  stats(): Promise<
    ProviderResult<{
      depth: number;
      oldestAgeSeconds: number;
      deadLettered: number;
    }>
  >;
}

// ---------------------------------------------------------------------------
// PDF rendering (FR-RPT-002)
// ---------------------------------------------------------------------------

export interface PdfRenderer {
  readonly name: string;
  isConfigured(): boolean;
  render(
    html: string,
    options: { title: string; locale: Locale },
  ): Promise<ProviderResult<{ bytes: Uint8Array }>>;
}

// ---------------------------------------------------------------------------
// Analytics (19.4)
// ---------------------------------------------------------------------------

export interface AnalyticsProvider {
  readonly name: string;
  isConfigured(): boolean;
  /**
   * Record a product event.
   *
   * 19.4: properties must use internal IDs and safe categories. Implementations
   * must drop anything not on their allowlist rather than forwarding it.
   */
  track(
    event: string,
    properties: Record<string, string | number>,
  ): Promise<ProviderResult<{ recorded: boolean }>>;
}

// ---------------------------------------------------------------------------
// Secret store (FR-ONB-005)
// ---------------------------------------------------------------------------

export interface SecretStore {
  readonly name: string;
  isConfigured(): boolean;
  /** Store a customer-supplied secret and return an opaque reference. */
  put(
    value: string,
    expiresAt: Date | null,
  ): Promise<ProviderResult<{ reference: string }>>;
  /** Resolve a reference server-side, immediately before use. */
  get(reference: string): Promise<ProviderResult<{ value: string }>>;
  revoke(reference: string): Promise<ProviderResult<{ revoked: boolean }>>;
}
