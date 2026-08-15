import "server-only";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/**
 * Release 0 operator gate. A single shared access token, checked server-side on
 * every /ops surface (PRD FR-AUTH-004). Full per-operator auth with stronger
 * factors arrives in Release 1; this is intentionally minimal but real:
 *  - The token never reaches the client; only a derived, opaque cookie does.
 *  - Comparison is constant-time.
 *  - In production, /ops is inaccessible unless OPS_ACCESS_TOKEN is configured.
 */
export const OPS_COOKIE = "si_ops";

function derive(token: string): string {
  return createHash("sha256").update(`school-inbox:ops:${token}`).digest("hex");
}

export function opsCookieValue(): string | null {
  const token = env.opsAccessToken();
  return token ? derive(token) : null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Validate a submitted token against OPS_ACCESS_TOKEN (constant-time). */
export function verifyOpsToken(submitted: string): boolean {
  const token = env.opsAccessToken();
  if (!token) return false;
  return safeEqual(submitted, token);
}

export type OpsAccess =
  | { state: "authed" }
  | { state: "unauthed" }
  | { state: "unconfigured"; devBypass: boolean };

/** Determine the current operator's access state from the session cookie. */
export async function getOpsAccess(): Promise<OpsAccess> {
  const expected = opsCookieValue();
  if (!expected) {
    // No token configured. Allow a clearly-flagged bypass in development only.
    return { state: "unconfigured", devBypass: !env.isProduction() };
  }
  const jar = await cookies();
  const cookie = jar.get(OPS_COOKIE)?.value;
  if (cookie && safeEqual(cookie, expected)) return { state: "authed" };
  return { state: "unauthed" };
}
