import { NextResponse } from "next/server"
import { createClient as createServerSupabase } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { validateStrongPassword } from "@/lib/password"

type StaffBody = {
  name?: string
  email?: string
  password?: string
  locationId?: string | null
}

function getServiceAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireAdmin(request?: Request) {
  const supabase = await createServerSupabase()
  if (!supabase) {
    return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 500 }) }
  }

  const service = getServiceAdmin()
  if (!service) {
    return {
      error: NextResponse.json(
        {
          error:
            "Staff management is not available yet. Ask an administrator to set SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 501 }
      ),
    }
  }

  let userId: string | null = (await supabase.auth.getUser()).data.user?.id ?? null

  if (!userId && request) {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (token) {
      const { data, error } = await service.auth.getUser(token)
      if (error || !data.user) {
        return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) }
      }
      userId = data.user.id
    }
  }

  if (!userId) {
    return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) }
  }

  const { data: profile } = await service
    .from("profiles")
    .select("id, name, email, role")
    .eq("id", userId)
    .maybeSingle()

  if (!profile || profile.role !== "admin") {
    return { error: NextResponse.json({ error: "Only admins can manage staff." }, { status: 403 }) }
  }

  return { db: service, adminUser: profile }
}

/** List staff accounts with their assigned location. */
export async function GET(request: Request) {
  const gate = await requireAdmin(request)
  if ("error" in gate && gate.error) return gate.error

  const { data, error } = await gate.db!
    .from("profiles")
    .select("id, name, email, role, location_id, created_at, locations(name)")
    .eq("role", "staff")
    .order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const staff = (data ?? []).map((row) => {
    const location = row.locations as unknown as { name: string } | null
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      locationId: row.location_id,
      locationName: location?.name ?? null,
      createdAt: row.created_at,
    }
  })

  return NextResponse.json({ staff })
}

/**
 * Create a staff account and assign them to a location.
 * Requires SUPABASE_SERVICE_ROLE_KEY (same as account deletion).
 */
export async function POST(request: Request) {
  const gate = await requireAdmin(request)
  if ("error" in gate && gate.error) return gate.error

  const adminClient = gate.db!

  const body = (await request.json()) as StaffBody
  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const locationId = body.locationId ?? null

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    )
  }

  const strengthError = validateStrongPassword(password)
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 })
  }

  if (locationId) {
    const { data: location } = await adminClient
      .from("locations")
      .select("id, name")
      .eq("id", locationId)
      .maybeSingle()

    if (!location) {
      return NextResponse.json({ error: "Location not found." }, { status: 400 })
    }
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "staff" },
  })

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Could not create staff account." },
      { status: 400 }
    )
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      name,
      role: "staff",
      location_id: locationId,
    })
    .eq("id", created.user.id)

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  await adminClient.from("audit_log").insert({
    actor_id: gate.adminUser!.id,
    actor_name: gate.adminUser!.name,
    action: "Staff Added",
    detail: `${name} <${email}> assigned to location ${locationId ?? "none"}`,
  })

  return NextResponse.json({
    ok: true,
    staff: {
      id: created.user.id,
      name,
      email,
      locationId,
    },
  })
}

/** Reassign staff to a location, or remove staff role (back to user). */
export async function PATCH(request: Request) {
  const gate = await requireAdmin(request)
  if ("error" in gate && gate.error) return gate.error

  const adminClient = gate.db!

  const body = (await request.json()) as {
    id?: string
    locationId?: string | null
    removeStaff?: boolean
  }

  if (!body.id) {
    return NextResponse.json({ error: "Staff id is required." }, { status: 400 })
  }

  const { data: existing } = await adminClient
    .from("profiles")
    .select("id, name, email, role")
    .eq("id", body.id)
    .maybeSingle()

  if (!existing || existing.role !== "staff") {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 })
  }

  if (body.removeStaff) {
    const { error } = await adminClient
      .from("profiles")
      .update({ role: "user", location_id: null })
      .eq("id", body.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await adminClient.from("audit_log").insert({
      actor_id: gate.adminUser!.id,
      actor_name: gate.adminUser!.name,
      action: "Staff Removed",
      detail: `${existing.name} <${existing.email}> is no longer staff`,
    })

    return NextResponse.json({ ok: true })
  }

  if (body.locationId) {
    const { data: location } = await adminClient
      .from("locations")
      .select("id, name")
      .eq("id", body.locationId)
      .maybeSingle()

    if (!location) {
      return NextResponse.json({ error: "Location not found." }, { status: 400 })
    }
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ location_id: body.locationId ?? null })
    .eq("id", body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await adminClient.from("audit_log").insert({
    actor_id: gate.adminUser!.id,
    actor_name: gate.adminUser!.name,
    action: "Staff Reassigned",
    detail: `${existing.name} → location ${body.locationId ?? "none"}`,
  })

  return NextResponse.json({ ok: true })
}
