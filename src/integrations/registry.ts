import type {
  AIProvider,
  AnalyticsProvider,
  BillingProvider,
  EmailProvider,
  FileStorageProvider,
  JobQueue,
  PdfRenderer,
  SecretStore,
} from './contracts';
import {
  noopAnalyticsProvider,
  unconfiguredAIProvider,
  unconfiguredBillingProvider,
  unconfiguredEmailProvider,
  unconfiguredFileStorageProvider,
  unconfiguredJobQueue,
  unconfiguredPdfRenderer,
  unconfiguredSecretStore,
} from './unconfigured';

/**
 * Provider registry.
 *
 * PRD ref: 14.3. This is the single place that decides which concrete
 * implementation backs each contract, so swapping a vendor is a change here
 * plus one new adapter file — never a change across domain code.
 *
 * IMPLEMENTATION STATUS: no vendor adapters exist yet, because this environment
 * has no Stripe, Resend, Supabase or AI-provider account. Each getter returns
 * the unconfigured implementation, which fails closed. Adding an adapter means
 * writing it under `src/integrations/<vendor>/` and selecting it here when its
 * credentials are present.
 */

export interface Providers {
  billing: BillingProvider;
  email: EmailProvider;
  ai: AIProvider;
  storage: FileStorageProvider;
  queue: JobQueue;
  pdf: PdfRenderer;
  analytics: AnalyticsProvider;
  secrets: SecretStore;
}

let overrides: Partial<Providers> = {};

export function getProviders(): Providers {
  return {
    billing: overrides.billing ?? unconfiguredBillingProvider,
    email: overrides.email ?? unconfiguredEmailProvider,
    ai: overrides.ai ?? unconfiguredAIProvider,
    storage: overrides.storage ?? unconfiguredFileStorageProvider,
    queue: overrides.queue ?? unconfiguredJobQueue,
    pdf: overrides.pdf ?? unconfiguredPdfRenderer,
    analytics: overrides.analytics ?? noopAnalyticsProvider,
    secrets: overrides.secrets ?? unconfiguredSecretStore,
  };
}

/**
 * Test seam for injecting fakes.
 *
 * Exported for tests only. Production code calls `getProviders()`.
 */
export function setProviderOverrides(next: Partial<Providers>): void {
  overrides = next;
}

export function resetProviderOverrides(): void {
  overrides = {};
}
