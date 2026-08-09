import {
  notConfigured,
  type AIProvider,
  type AnalyticsProvider,
  type BillingProvider,
  type EmailProvider,
  type FileStorageProvider,
  type JobQueue,
  type PdfRenderer,
  type ProviderResult,
  type SecretStore,
} from './contracts';

/**
 * Unconfigured provider implementations.
 *
 * PRD ref: 1.1.12 — "Stop and request a decision when a missing credential,
 * legal choice or vendor account prevents safe completion. Do not hard-code
 * fake production values."
 *
 * These are NOT mocks that pretend to work. Every method returns
 * `NOT_CONFIGURED`, so a feature depending on an unprovisioned vendor fails
 * loudly and visibly instead of appearing to succeed. A fake that returned
 * `{ok: true}` would let a checkout flow "succeed" without a payment, which is
 * exactly the handoff-rejection condition in section 28.
 */

export const unconfiguredBillingProvider: BillingProvider = {
  name: 'unconfigured-billing',
  isConfigured: () => false,
  createCheckoutSession: async () => notConfigured('billing'),
  createPortalSession: async () => notConfigured('billing'),
  verifyWebhook: async () => notConfigured('billing'),
  refund: async () => notConfigured('billing'),
};

export const unconfiguredEmailProvider: EmailProvider = {
  name: 'unconfigured-email',
  isConfigured: () => false,
  send: async () => notConfigured('email'),
};

export const unconfiguredAIProvider: AIProvider = {
  name: 'unconfigured-ai',
  isConfigured: () => false,
  // 15.6: "Provide a provider outage fallback to manual review rather than
  // blocking access to existing reports." An unconfigured evaluator therefore
  // routes work to an analyst; it never blocks the portal.
  evaluate: async () => notConfigured('AI evaluation'),
};

export const unconfiguredFileStorageProvider: FileStorageProvider = {
  name: 'unconfigured-storage',
  isConfigured: () => false,
  createUploadUrl: async () => notConfigured('file storage'),
  createDownloadUrl: async () => notConfigured('file storage'),
  delete: async () => notConfigured('file storage'),
};

export const unconfiguredJobQueue: JobQueue = {
  name: 'unconfigured-queue',
  isConfigured: () => false,
  enqueue: async () => notConfigured('job queue'),
  stats: async () => notConfigured('job queue'),
};

export const unconfiguredPdfRenderer: PdfRenderer = {
  name: 'unconfigured-pdf',
  isConfigured: () => false,
  render: async () => notConfigured('PDF renderer'),
};

/**
 * Analytics is the one provider whose unconfigured state is a success.
 *
 * Product analytics is optional and consent-gated (19.4). Dropping an event
 * when no analytics vendor is configured is the correct behaviour, not a
 * failure the caller needs to handle.
 */
export const noopAnalyticsProvider: AnalyticsProvider = {
  name: 'noop-analytics',
  isConfigured: () => false,
  track: async (): Promise<ProviderResult<{ recorded: boolean }>> => ({
    ok: true,
    value: { recorded: false },
  }),
};

export const unconfiguredSecretStore: SecretStore = {
  name: 'unconfigured-secrets',
  isConfigured: () => false,
  put: async () => notConfigured('secret store'),
  get: async () => notConfigured('secret store'),
  revoke: async () => notConfigured('secret store'),
};
