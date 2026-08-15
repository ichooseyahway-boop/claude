import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOpsToken, opsCookieValue, OPS_COOKIE } from "@/lib/ops/auth";
import { getStore } from "@/lib/database";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(1).max(500) });

/** Exchange a valid operator access token for an opaque, httpOnly session cookie. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`ops-login:${ip}`, { limit: 6, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const cookieValue = opsCookieValue();
  if (!cookieValue) {
    return NextResponse.json(
      { error: "Operations access is not configured." },
      { status: 503 },
    );
  }
  if (!verifyOpsToken(parsed.data.token)) {
    return NextResponse.json(
      { error: "Incorrect access token." },
      { status: 401 },
    );
  }

  await getStore().recordOpsEvent({
    actor: "operator",
    action: "ops.session.created",
    resource_type: "ops_session",
    resource_id: ip,
    metadata: {},
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPS_COOKIE, cookieValue, {
    httpOnly: true,
    secure: env.isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8-hour operator session
  });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPS_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
