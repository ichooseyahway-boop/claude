import { NextResponse } from "next/server";
import { isFunnelEvent, sanitizeProps } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * Analytics sink. Accepts only the closed set of funnel event names and the
 * sanitized, non-identifying property shape. Anything else is dropped. In
 * Release 0 events are counted server-side (logged); a real analytics provider
 * is wired in behind this same boundary later, so private data can never leak
 * to a third party by construction.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("event" in body) ||
    typeof (body as { event: unknown }).event !== "string" ||
    !isFunnelEvent((body as { event: string }).event)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = (body as { event: string }).event;
  const props = sanitizeProps((body as { props?: unknown }).props);

  // Release 0: structured server log only. No child/school/source content is
  // ever present here — the event set and prop shape guarantee it.
  console.info(
    JSON.stringify({
      kind: "funnel",
      event,
      props,
      at: new Date().toISOString(),
    }),
  );

  return NextResponse.json({ ok: true });
}
