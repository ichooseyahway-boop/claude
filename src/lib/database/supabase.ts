import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Server-only Supabase client using the SERVICE ROLE key. This bypasses Row
 * Level Security and must NEVER be imported into client code. RLS still guards
 * every browser-reachable path in later releases; Release 0 writes happen only
 * from trusted server routes (webhook, onboarding completion, ops).
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const { url, serviceRoleKey } = env.supabase();
  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
