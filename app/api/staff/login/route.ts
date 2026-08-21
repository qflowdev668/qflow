import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
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

async function sendStaffOtp(
  service: NonNullable<ReturnType<typeof getServiceAdmin>>,
  email: string
) {
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  })
  if (linkError) throw new Error(linkError.message)

  const code = linkData.properties?.email_otp
  if (!code) throw new Error("Could not create a login code. Try again.")

  await sendLoginCodeEmail(email, code, "staff")
}

/**
 * Step 1 of staff login: verify email + password, then email a Resend OTP.
 * No browser session is created here — the client must verify the OTP next.
 * Resend on the OTP screen also requires the password (no passwordless resend).
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string; resendOnly?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 })
  }

  const password = body.password
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 })
  }

  const rate = await enforceOtpRateLimit({
    request,
    identity: email,
    identityKind: "email",
    route: "/api/staff/login",
  })
  if (!rate.ok) return rate.response

  if (!getResend()) {
    return NextResponse.json(
      {
        error:
          "Resend is not configured. Add RESEND_API_KEY to .env.local (and optionally RESEND_FROM_EMAIL).",
      },
      { status: 501 }
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = getServiceAdmin()

  if (!url || !anonKey || !service) {
    return NextResponse.json(
      {
        error:
          "Staff login is not configured. Set SUPABASE_SERVICE_ROLE_KEY and Supabase keys in .env.local.",
      },
      { status: 501 }
    )
  }

  // Ephemeral client — does not write cookies to the browser.
  const anon = createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authData, error: authError } = await anon.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "Invalid email or password." },
      { status: 401 }
    )
  }

  const { data: profile } = await service
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle()

  // Drop the server-side session; browser never received it.
  await anon.auth.signOut()

  if (!profile || profile.role !== "staff") {
    return NextResponse.json(
      {
        error:
          "This account is not a staff account. Staff must sign in with the Staff sign-in option.",
      },
      { status: 403 }
    )
  }

  try {
    await sendStaffOtp(service, email)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send login code."
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    email,
    message: body.resendOnly
      ? "Login code sent to your email."
      : "Password verified. We sent a login code to your email.",
  })
}
