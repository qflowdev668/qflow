import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { isSupabaseConfigured } from "@/lib/supabase/helpers"

/** One storage key for every browser caller. Do not create a second client. */
export const SUPABASE_AUTH_STORAGE_KEY = "qflow-auth"

let client: SupabaseClient<Database> | null = null

/**
 * Browser client. Returns null when Supabase env vars are absent.
 *
 * `detectSessionInUrl` stays off so `/auth/callback` is the only place that
 * exchanges a PKCE code. The library still uses the PKCE flow for OAuth.
 * Password sign-in never exchanges a code.
 */
export function createClient(): SupabaseClient<Database> | null {
  if (typeof window === "undefined" || !isSupabaseConfigured()) {
    return null
  }

  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        isSingleton: true,
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          storageKey: SUPABASE_AUTH_STORAGE_KEY,
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    )
  }

  return client
}
