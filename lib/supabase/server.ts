import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { isSupabaseConfigured } from "@/lib/supabase/helpers"

/** Server client for route handlers and server components. */
export async function createClient(): Promise<SupabaseClient<Database> | null> {
  if (!isSupabaseConfigured()) return null

  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server components can't set cookies; the proxy refreshes sessions instead.
          }
        },
      },
    }
  )
}
