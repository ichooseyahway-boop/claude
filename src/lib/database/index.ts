import "server-only";
import type { DataStore } from "./store";
import { MemoryStore } from "./memory-store";
import { SupabaseStore } from "./supabase-store";
import { env } from "@/lib/env";

let store: DataStore | null = null;

/**
 * Returns the active data store. Uses Supabase when configured; otherwise falls
 * back to the in-memory dev/test store (with a one-time warning). This keeps
 * the whole Release 0 flow runnable locally without a database, while
 * production uses Supabase transparently. This module is `server-only`, so the
 * Supabase SDK never reaches a client bundle.
 */
export function getStore(): DataStore {
  if (store) return store;
  if (env.supabaseConfigured()) {
    store = new SupabaseStore();
  } else {
    if (env.isProduction()) {
      console.warn(
        "[school-inbox] SUPABASE not configured in production — using the " +
          "in-memory store. Orders and onboarding will NOT persist across " +
          "restarts. Configure Supabase before accepting real customers.",
      );
    }
    store = new MemoryStore();
  }
  return store;
}

export type { DataStore } from "./store";
