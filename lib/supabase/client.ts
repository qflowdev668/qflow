import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { isSupabaseConfigured } from "@/lib/supabase/helpers"

let client: SupabaseClient<Database> | null = null

/** Browser client. Returns null when Supabase env vars are absent. */
export function createClient(): SupabaseClient<Database> | null {
  if (typeof window === "undefined" || !isSupabaseConfigured()) {
    return null
  }

  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return client
}
