import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { serverEnv, isAuthConfigured } from '@/lib/env';

/**
 * Supabase server clients.
 *
 * PRD refs: FR-AUTH-001, 16.2, 1.1.3 (secrets stay server-side).
 *
 * Two clients, and the distinction matters:
 *
 *   - `anonServerClient` carries the caller's session cookie. Every query it
 *     makes is subject to row-level security, which is where tenant isolation
 *     is actually enforced.
 *   - `serviceRoleClient` bypasses row-level security. It exists only for
 *     operations that legitimately cross tenants (webhook processing, the
 *     operations queue) and every caller must scope its own queries by
 *     organization explicitly (16.2).
 *
 * Both return `null` when Supabase is not configured. They never fall back to a
 * placeholder URL or key: PRD 1.1.12 forbids hard-coding fake production
 * values, and a client pointed at a fake host fails in a far more confusing way
 * than a null does.
 */

export type ServerSupabaseClient = SupabaseClient;

export async function anonServerClient(): Promise<ServerSupabaseClient | null> {
  if (!isAuthConfigured()) return null;
  const env = serverEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        // Server components cannot set cookies. Supabase calls this during
        // token refresh; swallowing the failure there is correct, because the
        // refresh is retried by the route handler or middleware that can write.
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Intentionally ignored — see above.
        }
      },
    },
  });
}

/**
 * Service-role client. Server-only, and never to be reached from a component.
 *
 * Returns null rather than throwing so a missing key disables the one feature
 * that needs it instead of taking down the request.
 */
export function serviceRoleClient(): ServerSupabaseClient | null {
  const env = serverEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => undefined },
  });
}
