import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import {
  getAdminOtpConfig,
  isAuthorizedAdminPhone,
  normalizeSaPhone,
} from "@/lib/admin-access"
import { enforceOtpRateLimit } from "@/lib/rate-limit"
import { getResend, sendLoginCodeEmail } from "@/lib/resend"
import type { Database } from "@/lib/supabase/types"

function getServiceAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function ensureAdminUser(
  service: NonNullable<ReturnType<typeof getServiceAdmin>>,
  email: string
) {
  const { data: byEmail } = await service
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle()

  if (byEmail) {
    if (byEmail.role !== "admin") {
      await service.from("profiles").update({ role: "admin" }).eq("id", byEmail.id)
    }
    return byEmail.id
  }

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name: "QFlow Admin" },
  })

  if (createError) {
    const { data: listed } = await service.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email)
    if (!existing) throw createError

    await service.from("profiles").upsert({
      id: existing.id,
      email,
      name: (existing.user_metadata?.name as string) || "QFlow Admin",
      role: "admin",
    })
    return existing.id
  }

  if (created.user) {
    await service.from("profiles").upsert({
      id: created.user.id,
      email,
      name: "QFlow Admin",
      role: "admin",
    })
    return created.user.id
  }

  throw new Error("Could not create admin account.")
}

/**
 * Admin cellphone gate → OTP emailed via Resend (not Supabase SMTP).
 * The code is a real Supabase auth OTP from generateLink (no email is sent by Supabase).
 */
export async function POST(request: Request) {
  let body: { phone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const phone = normalizeSaPhone(body.phone || "")
  if (!phone) {
    return NextResponse.json(
      { error: "This cellphone number is not authorized for admin access." },
      { status: 403 }
    )
  }

  const rate = await enforceOtpRateLimit({
    request,
    identity: phone,
    identityKind: "phone",
    route: "/api/admin/otp/send",
  })
  if (!rate.ok) return rate.response

  if (!isAuthorizedAdminPhone(phone)) {
    return NextResponse.json(
      { error: "This cellphone number is not authorized for admin access." },
      { status: 403 }
    )
  }

  if (!getResend()) {
    return NextResponse.json(
      {
        error:
          "Resend is not configured. Add RESEND_API_KEY to .env.local (and optionally RESEND_FROM_EMAIL).",
      },
      { status: 501 }
    )
  }

  const config = getAdminOtpConfig()
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Admin OTP is not configured. Set ADMIN_OTP_PHONE and ADMIN_OTP_EMAIL in .env.local.",
      },
      { status: 501 }
    )
  }

  const { email } = config
  const service = getServiceAdmin()

  if (!service) {
    return NextResponse.json(
      {
        error:
          "Admin OTP is not configured. Set SUPABASE_SERVICE_ROLE_KEY and Supabase keys in .env.local.",
      },
      { status: 501 }
    )
  }

  try {
    await ensureAdminUser(service, email)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to prepare admin account."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  })

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  const code = linkData.properties?.email_otp
  if (!code) {
    return NextResponse.json(
      { error: "Could not create a login code. Try again." },
      { status: 500 }
    )
  }

  try {
    await sendLoginCodeEmail(email, code, "admin")
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send login code email."
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    message: "Login code sent to the admin email for this number.",
  })
}
