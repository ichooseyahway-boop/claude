import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/database";
import { saveDraftSchema, completeSchema } from "@/lib/onboarding/schema";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";
import type { OnboardingData } from "@/lib/database/types";

export const runtime = "nodejs";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save") }).passthrough(),
  z.object({ action: z.literal("complete") }).passthrough(),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const ip = clientIp(request);
  const limit = rateLimit(`onboarding:${ip}`, { limit: 40, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const store = getStore();
  const order = await store.getOrderByToken(token);
  if (!order) {
    return NextResponse.json(
      { error: "This onboarding link is invalid or has expired." },
      { status: 404 },
    );
  }
  if (order.status !== "paid") {
    return NextResponse.json(
      { error: "This order is not ready for onboarding." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const action = ActionSchema.safeParse(body);
  if (!action.success) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  // ---- Complete -------------------------------------------------------------
  if (action.data.action === "complete") {
    if (order.onboarding_status === "completed") {
      return NextResponse.json({
        ok: true,
        completed: true,
        alreadyDone: true,
      });
    }
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Please complete the required fields.",
          issues: flatten(parsed.error),
        },
        { status: 422 },
      );
    }
    const d = parsed.data.data;
    const now = new Date().toISOString();
    const data: OnboardingData = {
      account_name: d.account_name,
      email: d.email,
      timezone: d.timezone,
      children: d.children.map((c) => ({
        display_name: c.display_name,
        school_label: c.school_label || undefined,
        grade_label: c.grade_label || undefined,
      })),
      coparent_email: d.coparent_email || undefined,
      calendar_preference: d.calendar_preference,
      reminder_preference: d.reminder_preference,
      known_senders: d.known_senders,
      consent: {
        terms_accepted_at: now,
        privacy_accepted_at: now,
        prohibited_ack_at: now,
      },
    };

    const { family, children } = await store.completeOnboarding(token, data);
    await store.recordOpsEvent({
      actor: "customer",
      action: "onboarding.completed",
      resource_type: "family",
      resource_id: family.id,
      metadata: { order_id: order.id, children: children.length },
    });
    return NextResponse.json({ ok: true, completed: true });
  }

  // ---- Save draft -----------------------------------------------------------
  const parsed = saveDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Could not save.", issues: flatten(parsed.error) },
      { status: 422 },
    );
  }
  await store.saveOnboardingDraft(token, parsed.data.step, parsed.data.data);
  return NextResponse.json({ ok: true, saved: true });
}

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    out[issue.path.join(".") || "_"] = issue.message;
  }
  return out;
}
