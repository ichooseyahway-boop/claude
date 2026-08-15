import type { DataStore, EnsureOrderInput } from "./store";
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
import { nowIso, token, uuid } from "./ids";

/**
 * In-memory data store for local development and tests ONLY. State lives in
 * module scope, so it survives within a single running process and resets on
 * restart. It is never used when Supabase is configured. This lets the whole
 * Release 0 flow run and be tested without a database, while the real
 * persistence path is the Supabase store.
 */
interface MemoryState {
  orders: Map<string, Order>; // by order id
  ordersBySession: Map<string, string>; // session id -> order id
  ordersByToken: Map<string, string>; // token -> order id
  webhookEvents: Set<string>;
  drafts: Map<string, OnboardingDraft>; // token -> draft
  families: Map<string, Family>; // by order id
  children: Map<string, Child[]>; // by family id
  consents: Map<string, Consent>; // by order id
  opsEvents: OpsEvent[];
  notifications: Set<string>;
}

const g = globalThis as typeof globalThis & { __schoolInboxMem?: MemoryState };

function state(): MemoryState {
  if (!g.__schoolInboxMem) {
    g.__schoolInboxMem = {
      orders: new Map(),
      ordersBySession: new Map(),
      ordersByToken: new Map(),
      webhookEvents: new Set(),
      drafts: new Map(),
      families: new Map(),
      children: new Map(),
      consents: new Map(),
      opsEvents: [],
      notifications: new Set(),
    };
  }
  return g.__schoolInboxMem;
}

export class MemoryStore implements DataStore {
  readonly kind = "memory" as const;

  async ensureOrderForCheckout(
    input: EnsureOrderInput,
  ): Promise<{ order: Order; created: boolean }> {
    const s = state();
    const existingId = s.ordersBySession.get(input.stripe_checkout_session_id);
    if (existingId) {
      const existing = s.orders.get(existingId)!;
      return { order: existing, created: false };
    }
    const id = uuid();
    const tok = token();
    const ts = nowIso();
    const order: Order = {
      id,
      offer_id: input.offer_id,
      stripe_checkout_session_id: input.stripe_checkout_session_id,
      stripe_customer_id: input.stripe_customer_id,
      stripe_payment_intent_id: input.stripe_payment_intent_id,
      amount_total: input.amount_total,
      currency: input.currency,
      customer_email: input.customer_email,
      status: input.status,
      onboarding_status: "not_started",
      onboarding_token: tok,
      created_at: ts,
      updated_at: ts,
    };
    s.orders.set(id, order);
    s.ordersBySession.set(order.stripe_checkout_session_id, id);
    s.ordersByToken.set(tok, id);
    return { order, created: true };
  }

  async getOrderBySessionId(sessionId: string): Promise<Order | null> {
    const s = state();
    const id = s.ordersBySession.get(sessionId);
    return id ? (s.orders.get(id) ?? null) : null;
  }

  async getOrderByToken(tok: string): Promise<Order | null> {
    const s = state();
    const id = s.ordersByToken.get(tok);
    return id ? (s.orders.get(id) ?? null) : null;
  }

  async listOrders(): Promise<OrderWithFamily[]> {
    const s = state();
    return [...s.orders.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((order) => {
        const family = s.families.get(order.id) ?? null;
        const children = family ? (s.children.get(family.id) ?? []) : [];
        const consent = s.consents.get(order.id) ?? null;
        return { order, family, children, consent };
      });
  }

  async markWebhookEventProcessed(
    eventId: string,
    _type: string,
  ): Promise<boolean> {
    const s = state();
    if (s.webhookEvents.has(eventId)) return false;
    s.webhookEvents.add(eventId);
    return true;
  }

  async saveOnboardingDraft(
    tok: string,
    step: number,
    data: OnboardingData,
  ): Promise<void> {
    const s = state();
    const order = await this.getOrderByToken(tok);
    if (!order) throw new Error("Unknown onboarding token");
    s.drafts.set(tok, { order_id: order.id, step, data, updated_at: nowIso() });
    if (order.onboarding_status === "not_started") {
      order.onboarding_status = "in_progress";
      order.updated_at = nowIso();
    }
  }

  async getOnboardingDraft(tok: string): Promise<OnboardingDraft | null> {
    return state().drafts.get(tok) ?? null;
  }

  async completeOnboarding(
    tok: string,
    data: OnboardingData,
  ): Promise<{ family: Family; children: Child[]; consent: Consent }> {
    const s = state();
    const order = await this.getOrderByToken(tok);
    if (!order) throw new Error("Unknown onboarding token");

    const existing = s.families.get(order.id);
    if (existing) {
      // Idempotent: onboarding already completed for this order.
      return {
        family: existing,
        children: s.children.get(existing.id) ?? [],
        consent: s.consents.get(order.id) ?? {
          terms_accepted_at: null,
          privacy_accepted_at: null,
          prohibited_ack_at: null,
        },
      };
    }

    const ts = nowIso();
    const familyId = uuid();
    const family: Family = {
      id: familyId,
      order_id: order.id,
      name: data.account_name ?? "",
      email: data.email ?? order.customer_email ?? "",
      timezone: data.timezone ?? "America/Toronto",
      status: "onboarding",
      service_tier: order.offer_id,
      retention_days: 30,
      calendar_preference: data.calendar_preference ?? null,
      reminder_preference: data.reminder_preference ?? null,
      coparent_email: data.coparent_email ?? null,
      known_senders: parseSenders(data.known_senders),
      created_at: ts,
      updated_at: ts,
    };
    const children: Child[] = (data.children ?? [])
      .filter((c) => c.display_name.trim().length > 0)
      .map((c, i) => ({
        id: uuid(),
        family_id: familyId,
        display_name: c.display_name.trim(),
        school_label: c.school_label?.trim() || null,
        grade_label: c.grade_label?.trim() || null,
        color_token: CHILD_COLORS[i % CHILD_COLORS.length]!,
        created_at: ts,
      }));
    const consent: Consent = data.consent ?? {
      terms_accepted_at: ts,
      privacy_accepted_at: ts,
      prohibited_ack_at: ts,
    };

    s.families.set(order.id, family);
    s.children.set(familyId, children);
    s.consents.set(order.id, consent);
    order.onboarding_status = "completed";
    order.updated_at = ts;

    return { family, children, consent };
  }

  async recordOpsEvent(
    input: Omit<OpsEvent, "id" | "created_at">,
  ): Promise<void> {
    state().opsEvents.push({ ...input, id: uuid(), created_at: nowIso() });
  }

  async listOpsEvents(limit = 100): Promise<OpsEvent[]> {
    return [...state().opsEvents]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async claimNotification(
    idempotencyKey: string,
    _type: string,
    _recipient: string,
  ): Promise<boolean> {
    const s = state();
    if (s.notifications.has(idempotencyKey)) return false;
    s.notifications.add(idempotencyKey);
    return true;
  }
}

const CHILD_COLORS = ["--sage", "--gold", "--sky-deep", "--coral"];

function parseSenders(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));
}
