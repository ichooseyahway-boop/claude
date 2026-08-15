import type {
  Child,
  Consent,
  Family,
  OnboardingData,
  OnboardingDraft,
  OpsEvent,
  Order,
  OrderWithFamily,
} from "./types";

export interface EnsureOrderInput {
  offer_id: string;
  stripe_checkout_session_id: string;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_total: number | null;
  currency: string | null;
  customer_email: string | null;
  status: Order["status"];
}

/**
 * The persistence boundary for Release 0. Both the Supabase-backed store and
 * the in-memory dev/test store implement this. Nothing above this interface
 * knows which backend is in use.
 */
export interface DataStore {
  readonly kind: "supabase" | "memory";

  /**
   * Idempotently create the order for a completed checkout session. Keyed on
   * `stripe_checkout_session_id`: repeated calls for the same session return
   * the existing order with `created: false` (PRD FR-COM-003, §19 acceptance).
   */
  ensureOrderForCheckout(
    input: EnsureOrderInput,
  ): Promise<{ order: Order; created: boolean }>;

  getOrderBySessionId(sessionId: string): Promise<Order | null>;
  getOrderByToken(token: string): Promise<Order | null>;
  listOrders(): Promise<OrderWithFamily[]>;

  /**
   * Record a Stripe event id as processed. Returns `true` the first time and
   * `false` if it was already recorded — a second idempotency guard for
   * webhook replays.
   */
  markWebhookEventProcessed(eventId: string, type: string): Promise<boolean>;

  saveOnboardingDraft(
    token: string,
    step: number,
    data: OnboardingData,
  ): Promise<void>;
  getOnboardingDraft(token: string): Promise<OnboardingDraft | null>;

  /**
   * Materialize the family, children, and consent from a completed onboarding,
   * and mark the order's onboarding as completed. Idempotent per order.
   */
  completeOnboarding(
    token: string,
    data: OnboardingData,
  ): Promise<{ family: Family; children: Child[]; consent: Consent }>;

  recordOpsEvent(input: Omit<OpsEvent, "id" | "created_at">): Promise<void>;
  listOpsEvents(limit?: number): Promise<OpsEvent[]>;

  /**
   * Record a notification send keyed by idempotency key. Returns true if this
   * is the first time (caller should send), false if already recorded.
   */
  claimNotification(
    idempotencyKey: string,
    type: string,
    recipient: string,
  ): Promise<boolean>;
}
