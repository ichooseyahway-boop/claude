/**
 * Provider interfaces (PRD 14.3).
 *
 * PRD 5.3 sets the constraint these exist to satisfy: no vendor may be so
 * deeply embedded that changing billing, database, email or AI provider would
 * require a rewrite. Domain code depends on these interfaces; vendor SDKs are
 * imported only inside `src/integrations/<vendor>/`.
 *
 * Every method that reaches a network returns a discriminated result rather
 * than throwing, so a provider outage becomes a handled state — PRD 18.2
 * requires released reports to stay readable when the AI provider is down, and
 * PRD 15.6 requires a fallback to manual review rather than a hard failure.
 */

import type { EvaluatorOutput } from '@/domain/evaluations/schema';
import type { Locale } from '@/lib/i18n/config';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

export type ProviderResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: {
        /** Stable, non-sensitive code suitable for logs and the error envelope. */
        readonly code: string;
        readonly message: string;
        /** True when a bounded retry is appropriate (PRD 18.2). */
        readonly retryable: boolean;
      };
    };

// ---------------------------------------------------------------------------
// BillingProvider (FR-BILL-001..005)
// ---------------------------------------------------------------------------

export interface CheckoutSessionRequest {
  readonly organizationId: string;
  readonly packageCode: string;
  readonly providerPriceId: string;
  readonly customerEmail: string;
  readonly locale: Locale;
  /** PRD 13.5: required for checkout creation. */
  readonly idempotencyKey: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  /**
   * Signed server-side metadata linking the session to a pending order
   * (FR-BILL-001). Never trusted back from the client.
   */
  readonly signedMetadata: string;
}

export interface CheckoutSession {
  readonly providerSessionId: string;
  readonly redirectUrl: string;
  readonly expiresAt: string;
}

/** The verified, provider-neutral view of a billing webhook. */
export interface BillingEvent {
  readonly providerEventId: string;
  readonly type:
    | 'payment_succeeded'
    | 'payment_failed'
    | 'refunded'
    | 'dispute_opened'
    | 'subscription_updated'
    | 'subscription_cancelled'
    | 'unhandled';
  readonly organizationId?: string;
  readonly orderIdempotencyKey?: string;
  readonly providerSubscriptionId?: string;
  readonly occurredAt: string;
}

export interface BillingProvider {
  createCheckoutSession(request: CheckoutSessionRequest): Promise<ProviderResult<CheckoutSession>>;

  /**
   * Reads payment state from the provider.
   *
   * FR-BILL-001: the success page must verify server-side. A query-string
   * `?success=true` proves nothing, so there is no method here that accepts one.
   */
  getPaymentState(
    providerSessionId: string,
  ): Promise<ProviderResult<{ paid: boolean; providerPaymentId?: string; amountCents: number }>>;

  createBillingPortalSession(input: {
    readonly providerCustomerId: string;
    readonly returnUrl: string;
    readonly locale: Locale;
  }): Promise<ProviderResult<{ redirectUrl: string; expiresAt: string }>>;

  /**
   * Verifies a webhook signature and parses the payload.
   *
   * FR-BILL-002: an unverified payload must never reach business logic, which
   * is why parsing and verification are a single operation here rather than
   * two steps a caller could accidentally separate.
   */
  verifyAndParseWebhook(input: {
    readonly rawBody: string;
    readonly signatureHeader: string | null;
  }): ProviderResult<BillingEvent>;

  issueRefund(input: {
    readonly providerPaymentId: string;
    readonly amountCents?: number;
    readonly reason: string;
    readonly idempotencyKey: string;
  }): Promise<ProviderResult<{ providerRefundId: string }>>;
}

// ---------------------------------------------------------------------------
// EmailProvider (FR-NOT-001, FR-NOT-002)
// ---------------------------------------------------------------------------

export type EmailTemplate =
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

export interface EmailProvider {
  /**
   * Sends a transactional email.
   *
   * `params` carries identifiers and short safe labels only. FR-NOT-002
   * forbids secrets, full transcripts, detailed critical evidence and
   * sensitive documents in email — the recipient is linked to the portal
   * instead, which is why there is no `body` or `attachment` parameter.
   */
  send(input: {
    readonly to: string;
    readonly template: EmailTemplate;
    readonly locale: Locale;
    readonly params: Readonly<Record<string, string | number>>;
    readonly idempotencyKey?: string;
  }): Promise<ProviderResult<{ providerMessageId: string }>>;
}

// ---------------------------------------------------------------------------
// AIProvider (PRD 15)
// ---------------------------------------------------------------------------

export interface EvaluationRequest {
  /**
   * The system instruction. PRD 15.5: untrusted content is NEVER concatenated
   * into this string — it travels in `untrustedContent` and the adapter is
   * responsible for delimiting it.
   */
  readonly systemPrompt: string;
  readonly promptVersion: string;
  readonly rubricVersion: string;
  /** Minimum necessary evaluator input package (PRD 15.2). */
  readonly untrustedContent: {
    readonly scenarioObjective: string;
    readonly expectedFacts: readonly string[];
    readonly disallowedOutcomes: readonly string[];
    readonly capturedResponse: readonly { readonly turn: number; readonly text: string }[];
    readonly policyExcerpts: readonly {
      readonly sourceId: string;
      readonly excerptId: string;
      readonly text: string;
    }[];
    readonly locale: Locale;
  };
  readonly maxOutputTokens: number;
  readonly timeoutMs: number;
}

export interface EvaluationResponse {
  /** Raw text, still unvalidated. The caller runs `parseEvaluatorOutput`. */
  readonly rawOutput: string;
  /** FR-EVAL-004: recorded against every evaluation for reproducibility. */
  readonly modelIdentifier: string;
  readonly costCents: number;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface AIProvider {
  readonly name: string;
  readonly modelIdentifier: string;

  evaluate(request: EvaluationRequest): Promise<ProviderResult<EvaluationResponse>>;

  /** Cheap liveness check used by the readiness endpoint and the status page. */
  healthCheck(): Promise<ProviderResult<{ healthy: boolean }>>;
}

/** A parsed evaluation, after schema validation. Convenience alias. */
export type ValidatedEvaluation = EvaluatorOutput;

// ---------------------------------------------------------------------------
// FileStorageProvider (FR-ONB-004, FR-RUN-005, PRD 16.1)
// ---------------------------------------------------------------------------

export interface FileStorageProvider {
  /**
   * Issues a short-lived upload URL.
   *
   * The content type and byte ceiling are bound into the URL so a client
   * cannot upload something other than what was authorized (FR-ONB-004).
   */
  createUploadUrl(input: {
    readonly organizationId: string;
    readonly key: string;
    readonly contentType: string;
    readonly maxBytes: number;
    readonly expiresInSeconds: number;
  }): Promise<ProviderResult<{ url: string; key: string; expiresAt: string }>>;

  /**
   * Issues a short-lived download URL.
   *
   * `organizationId` is required and must be checked against the object's
   * tenant before signing. PRD 16.2 requires a test proving download URLs
   * cannot be generated across tenants, and an interface that made the tenant
   * optional would make that test impossible to satisfy by construction.
   */
  createDownloadUrl(input: {
    readonly organizationId: string;
    readonly key: string;
    readonly expiresInSeconds: number;
    readonly downloadFilename?: string;
  }): Promise<ProviderResult<{ url: string; expiresAt: string }>>;

  delete(input: {
    readonly organizationId: string;
    readonly key: string;
  }): Promise<ProviderResult<{ deleted: boolean }>>;
}

// ---------------------------------------------------------------------------
// JobQueue (PRD 14.2, 18.2)
// ---------------------------------------------------------------------------

export type JobName =
  | 'evaluate_test_case'
  | 'render_report_pdf'
  | 'apply_retention_policy'
  | 'send_notification'
  | 'schedule_monitoring_cycle';

export interface JobQueue {
  enqueue(input: {
    readonly name: JobName;
    readonly payload: Readonly<Record<string, string | number | boolean>>;
    /** PRD 13.5: retried job submission must be idempotent. */
    readonly idempotencyKey: string;
    readonly runAfter?: string;
    readonly maxAttempts?: number;
  }): Promise<ProviderResult<{ jobId: string }>>;

  /** PRD 21.3 requires a dead-letter alert, which needs a depth to alert on. */
  getQueueDepth(): Promise<ProviderResult<{ pending: number; deadLettered: number }>>;
}

// ---------------------------------------------------------------------------
// PdfRenderer (FR-RPT-002)
// ---------------------------------------------------------------------------

export interface PdfRenderer {
  /**
   * Renders report HTML to PDF.
   *
   * The renderer must run with no network egress: the HTML is fully
   * self-contained, and a report that could fetch a remote asset would be a
   * path for injected content to phone out.
   */
  render(input: {
    readonly html: string;
    readonly locale: Locale;
    readonly title: string;
  }): Promise<ProviderResult<{ pdf: Uint8Array; byteSize: number }>>;
}

// ---------------------------------------------------------------------------
// AnalyticsProvider (PRD 19.4)
// ---------------------------------------------------------------------------

export type AnalyticsEventName =
  | 'pricing_viewed'
  | 'checkout_started'
  | 'checkout_completed'
  | 'account_activated'
  | 'onboarding_step_completed'
  | 'authorization_signed'
  | 'source_uploaded'
  | 'onboarding_submitted'
  | 'scope_approved'
  | 'audit_plan_approved'
  | 'test_run_started'
  | 'test_run_completed'
  | 'finding_created'
  | 'report_previewed'
  | 'support_request_created'
  | 'privacy_request_created'
  | 'report_released'
  | 'report_viewed'
  | 'report_downloaded'
  | 'remediation_updated'
  | 'retest_requested'
  | 'billing_portal_opened'
  | 'subscription_cancelled';

/**
 * Analytics property values.
 *
 * Restricted to identifiers, numbers, booleans and short enumerated
 * categories. PRD 19.4 forbids sending transcript text, prompt text, policy
 * content, finding narrative, credentials, names beyond account analytics
 * needs, or uploaded filenames — so free-form strings are not accepted here,
 * and the adapter rejects any value that looks like prose.
 */
export type AnalyticsValue = string | number | boolean;

export interface AnalyticsProvider {
  track(input: {
    readonly event: AnalyticsEventName;
    readonly organizationId?: string;
    readonly userId?: string;
    readonly properties?: Readonly<Record<string, AnalyticsValue>>;
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// SecretStore (FR-ONB-005)
// ---------------------------------------------------------------------------

export interface SecretStore {
  /**
   * Stores a secret and returns a reference.
   *
   * The reference is what goes in `connection_configs.secret_reference`; the
   * database check constraint rejects anything that does not look like one, so
   * a plaintext credential cannot be written to that column by mistake.
   */
  put(input: {
    readonly organizationId: string;
    readonly name: string;
    readonly value: string;
    readonly expiresAt?: string;
  }): Promise<ProviderResult<{ reference: string }>>;

  /**
   * Resolves a reference to its value.
   *
   * Server-side only, and callers must never log, return or render the result.
   */
  resolve(reference: string): Promise<ProviderResult<{ value: string }>>;

  revoke(reference: string): Promise<ProviderResult<{ revoked: boolean }>>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * The full provider set a request handler or worker needs.
 *
 * Passing this explicitly rather than importing singletons is what makes the
 * domain testable without network access, and what makes swapping a vendor a
 * one-file change.
 */
export interface Providers {
  readonly billing: BillingProvider;
  readonly email: EmailProvider;
  readonly ai: AIProvider;
  readonly storage: FileStorageProvider;
  readonly queue: JobQueue;
  readonly pdf: PdfRenderer;
  readonly analytics: AnalyticsProvider;
  readonly secrets: SecretStore;
}
