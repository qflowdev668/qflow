import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAdminOtpConfig, isAuthorizedAdminPhone, normalizeSaPhone } from "@/lib/admin-access"

/** Verify admin cellphone OTP and set the browser session cookie. */
export async function POST(request: Request) {
  let body: { phone?: string; token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const phone = normalizeSaPhone(body.phone || "")
  const token = (body.token || "").replace(/\D/g, "")
  if (!phone || !isAuthorizedAdminPhone(phone)) {
    return NextResponse.json(
      { error: "This cellphone number is not authorized for admin access." },
      { status: 403 }
    )
  }

  if (token.length < 6) {
    return NextResponse.json({ error: "Enter the login code from email." }, { status: 400 })
  }

  const config = getAdminOtpConfig()
  const supabase = await createClient()
  if (!config || !supabase) {
    return NextResponse.json({ error: "Admin OTP is not configured." }, { status: 501 })
  }

  let lastError = "Invalid login code."
  for (const type of ["magiclink", "email"] as const) {
    const { error } = await supabase.auth.verifyOtp({
      email: config.email,
      token,
      type,
    })
    if (!error) {
      return NextResponse.json({ ok: true })
    }
    lastError = error.message
  }

  return NextResponse.json({ error: lastError }, { status: 401 })
}
