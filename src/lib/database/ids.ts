import { randomBytes, randomUUID } from "crypto";

export function uuid(): string {
  return randomUUID();
}

/** URL-safe, unguessable onboarding token. */
export function token(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function nowIso(): string {
  return new Date().toISOString();
}
