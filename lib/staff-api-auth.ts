import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export function getServiceAdmin(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type StaffProfile = {
  role: Database["public"]["Tables"]["profiles"]["Row"]["role"]
  location_id: string | null
  name: string | null
}

export type StaffAuthResult = {
  user: { id: string; email?: string | null }
  profile: StaffProfile
  locationId: string
  db: SupabaseClient<Database>
}

/** Verify the caller is staff/admin with an assigned location; return a DB client for reads/writes. */
export async function requireStaffAuth(
  supabase: SupabaseClient<Database> | null
): Promise<StaffAuthResult | NextResponse> {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 501 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in as staff to continue." }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, location_id, name")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: "Could not load your staff profile." }, { status: 403 })
  }

  if (profile.role !== "staff" && profile.role !== "admin") {
    return NextResponse.json({ error: "Only staff can access this." }, { status: 403 })
  }

  const locationId = profile.location_id
  if (!locationId) {
    return NextResponse.json(
      {
        error:
          "Your staff account has no location assigned. Ask an admin to assign your clinic in Admin → Staff.",
      },
      { status: 403 }
    )
  }

  const service = getServiceAdmin()
  const db = service ?? supabase

  return { user, profile, locationId, db }
}

export function isStaffAuthError(
  result: StaffAuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}
