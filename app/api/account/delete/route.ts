import { NextResponse } from "next/server"
import { createClient as createServerSupabase } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

/**
 * POPIA erasure: removes the signed-in user's auth account. Profile, queue
 * entries, notifications and history are removed by `on delete cascade`.
 * Requires the service role key, which only exists server-side.
 */
export async function POST() {
  const supabase = await createServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 })
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Account deletion is not available yet. Ask an administrator to set SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 501 }
    )
  }

  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
