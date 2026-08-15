/**
 * Release 0 data model (PRD §13 subset). UUIDs for ids, UTC ISO timestamps.
 * Every family-owned record carries a family reference (directly or through the
 * order it belongs to).
 */

export type OrderStatus = "pending_payment" | "paid" | "refunded" | "cancelled";
export type OnboardingStatus = "not_started" | "in_progress" | "completed";

export interface Order {
  id: string;
  offer_id: string;
  stripe_checkout_session_id: string;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_total: number | null; // minor units (cents)
  currency: string | null;
  customer_email: string | null;
  status: OrderStatus;
  onboarding_status: OnboardingStatus;
  onboarding_token: string;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  display_name: string; // nickname or initials — never required to be legal name
  school_label: string | null;
  grade_label: string | null;
  color_token: string;
  created_at: string;
}

export type FamilyStatus = "onboarding" | "active" | "closed";

export interface Family {
  id: string;
  order_id: string;
  name: string;
  email: string;
  timezone: string;
  status: FamilyStatus;
  service_tier: string;
  retention_days: number;
  calendar_preference: string | null;
  reminder_preference: string | null;
  coparent_email: string | null;
  known_senders: string[];
  created_at: string;
  updated_at: string;
}

export interface Consent {
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  prohibited_ack_at: string | null;
}

/** Save-and-resume onboarding draft, keyed by the order's onboarding token. */
export interface OnboardingDraft {
  order_id: string;
  step: number;
  data: OnboardingData;
  updated_at: string;
}

export interface OnboardingChildInput {
  display_name: string;
  school_label?: string;
  grade_label?: string;
}

export interface OnboardingData {
  account_name?: string;
  email?: string;
  timezone?: string;
  children?: OnboardingChildInput[];
  coparent_email?: string;
  calendar_preference?: string;
  reminder_preference?: string;
  known_senders?: string;
  consent?: Consent;
}

export interface OpsEvent {
  id: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  type: string;
  recipient: string;
  idempotency_key: string;
  status: "sent" | "failed" | "skipped";
  created_at: string;
}

/** Aggregated view an operator needs for a paid order awaiting materials. */
export interface OrderWithFamily {
  order: Order;
  family: Family | null;
  children: Child[];
  consent: Consent | null;
}
