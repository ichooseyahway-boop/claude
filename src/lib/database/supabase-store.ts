import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
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
import { supabaseAdmin } from "./supabase";
import { nowIso, token } from "./ids";

const CHILD_COLORS = ["--sage", "--gold", "--sky-deep", "--coral"];

/**
 * Supabase (PostgreSQL) implementation of the persistence boundary. Table
 * shapes match supabase/migrations. Idempotency relies on unique constraints:
 * a duplicate insert raises Postgres error 23505, which we catch and treat as
 * "already exists".
 */
export class SupabaseStore implements DataStore {
  readonly kind = "supabase" as const;
  private get db(): SupabaseClient {
    return supabaseAdmin();
  }

  async ensureOrderForCheckout(
    input: EnsureOrderInput,
  ): Promise<{ order: Order; created: boolean }> {
    const existing = await this.getOrderBySessionId(
      input.stripe_checkout_session_id,
    );
    if (existing) return { order: existing, created: false };

    const row = {
      offer_id: input.offer_id,
      stripe_checkout_session_id: input.stripe_checkout_session_id,
      stripe_customer_id: input.stripe_customer_id,
      stripe_payment_intent_id: input.stripe_payment_intent_id,
      amount_total: input.amount_total,
      currency: input.currency,
      customer_email: input.customer_email,
      status: input.status,
      onboarding_status: "not_started" as const,
      onboarding_token: token(),
    };

    const { data, error } = await this.db
      .from("orders")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      // Unique violation → a concurrent webhook created it first. Re-read.
      if (error.code === "23505") {
        const again = await this.getOrderBySessionId(
          input.stripe_checkout_session_id,
        );
        if (again) return { order: again, created: false };
      }
      throw error;
    }
    return { order: data as Order, created: true };
  }

  async getOrderBySessionId(sessionId: string): Promise<Order | null> {
    const { data, error } = await this.db
      .from("orders")
      .select("*")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (error) throw error;
    return (data as Order | null) ?? null;
  }

  async getOrderByToken(tok: string): Promise<Order | null> {
    const { data, error } = await this.db
      .from("orders")
      .select("*")
      .eq("onboarding_token", tok)
      .maybeSingle();
    if (error) throw error;
    return (data as Order | null) ?? null;
  }

  async listOrders(): Promise<OrderWithFamily[]> {
    const { data: orders, error } = await this.db
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const result: OrderWithFamily[] = [];
    for (const order of (orders ?? []) as Order[]) {
      const { data: family } = await this.db
        .from("families")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      let children: Child[] = [];
      let consent: Consent | null = null;
      if (family) {
        const { data: kids } = await this.db
          .from("children")
          .select("*")
          .eq("family_id", (family as Family).id);
        children = (kids as Child[]) ?? [];
        const { data: con } = await this.db
          .from("consents")
          .select("terms_accepted_at, privacy_accepted_at, prohibited_ack_at")
          .eq("order_id", order.id)
          .maybeSingle();
        consent = (con as Consent | null) ?? null;
      }
      result.push({
        order,
        family: (family as Family | null) ?? null,
        children,
        consent,
      });
    }
    return result;
  }

  async markWebhookEventProcessed(
    eventId: string,
    type: string,
  ): Promise<boolean> {
    const { error } = await this.db
      .from("webhook_events")
      .insert({ id: eventId, type, processed_at: nowIso() });
    if (error) {
      if (error.code === "23505") return false; // already processed
      throw error;
    }
    return true;
  }

  async saveOnboardingDraft(
    tok: string,
    step: number,
    data: OnboardingData,
  ): Promise<void> {
    const order = await this.getOrderByToken(tok);
    if (!order) throw new Error("Unknown onboarding token");
    const { error } = await this.db.from("onboarding_drafts").upsert(
      {
        order_id: order.id,
        step,
        data,
        updated_at: nowIso(),
      },
      { onConflict: "order_id" },
    );
    if (error) throw error;
    if (order.onboarding_status === "not_started") {
      await this.db
        .from("orders")
        .update({ onboarding_status: "in_progress", updated_at: nowIso() })
        .eq("id", order.id);
    }
  }

  async getOnboardingDraft(tok: string): Promise<OnboardingDraft | null> {
    const order = await this.getOrderByToken(tok);
    if (!order) return null;
    const { data, error } = await this.db
      .from("onboarding_drafts")
      .select("order_id, step, data, updated_at")
      .eq("order_id", order.id)
      .maybeSingle();
    if (error) throw error;
    return (data as OnboardingDraft | null) ?? null;
  }

  async completeOnboarding(
    tok: string,
    data: OnboardingData,
  ): Promise<{ family: Family; children: Child[]; consent: Consent }> {
    const order = await this.getOrderByToken(tok);
    if (!order) throw new Error("Unknown onboarding token");

    const { data: existing } = await this.db
      .from("families")
      .select("*")
      .eq("order_id", order.id)
      .maybeSingle();
    if (existing) {
      const family = existing as Family;
      const { data: kids } = await this.db
        .from("children")
        .select("*")
        .eq("family_id", family.id);
      const { data: con } = await this.db
        .from("consents")
        .select("terms_accepted_at, privacy_accepted_at, prohibited_ack_at")
        .eq("order_id", order.id)
        .maybeSingle();
      return {
        family,
        children: (kids as Child[]) ?? [],
        consent: (con as Consent | null) ?? {
          terms_accepted_at: null,
          privacy_accepted_at: null,
          prohibited_ack_at: null,
        },
      };
    }

    const ts = nowIso();
    const { data: famRow, error: famErr } = await this.db
      .from("families")
      .insert({
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
      })
      .select("*")
      .single();
    if (famErr) throw famErr;
    const family = famRow as Family;

    const childInputs = (data.children ?? []).filter(
      (c) => c.display_name.trim().length > 0,
    );
    let children: Child[] = [];
    if (childInputs.length > 0) {
      const { data: kidRows, error: kidErr } = await this.db
        .from("children")
        .insert(
          childInputs.map((c, i) => ({
            family_id: family.id,
            display_name: c.display_name.trim(),
            school_label: c.school_label?.trim() || null,
            grade_label: c.grade_label?.trim() || null,
            color_token: CHILD_COLORS[i % CHILD_COLORS.length]!,
          })),
        )
        .select("*");
      if (kidErr) throw kidErr;
      children = (kidRows as Child[]) ?? [];
    }

    const consent: Consent = data.consent ?? {
      terms_accepted_at: ts,
      privacy_accepted_at: ts,
      prohibited_ack_at: ts,
    };
    await this.db.from("consents").insert({ order_id: order.id, ...consent });
    await this.db
      .from("orders")
      .update({ onboarding_status: "completed", updated_at: ts })
      .eq("id", order.id);

    return { family, children, consent };
  }

  async recordOpsEvent(
    input: Omit<OpsEvent, "id" | "created_at">,
  ): Promise<void> {
    const { error } = await this.db.from("audit_events").insert({
      actor: input.actor,
      action: input.action,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      metadata: input.metadata,
    });
    if (error) throw error;
  }

  async listOpsEvents(limit = 100): Promise<OpsEvent[]> {
    const { data, error } = await this.db
      .from("audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as OpsEvent[]) ?? [];
  }

  async claimNotification(
    idempotencyKey: string,
    type: string,
    recipient: string,
  ): Promise<boolean> {
    const { error } = await this.db.from("notifications").insert({
      idempotency_key: idempotencyKey,
      type,
      recipient,
      status: "sent",
    });
    if (error) {
      if (error.code === "23505") return false;
      throw error;
    }
    return true;
  }
}

function parseSenders(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));
}
