import { NextResponse } from "next/server"
import { getResend, sendPasswordResetEmail } from "@/lib/resend"
import {
  createPasswordResetToken,
  getResetServiceClient,
} from "@/lib/password-reset"
import { enforceOtpRateLimit } from "@/lib/rate-limit"

/**
 * Send a password-recovery OTP via Resend and return a short-lived reset token
 * for URL-based flow state (survives new tabs / refresh).
 */
export async function POST(request: Request) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const limited = await enforceOtpRateLimit({
    request,
    identity: email,
    identityKind: "email",
    route: "/api/auth/reset/send",
  })
  if (!limited.ok) return limited.response

  if (!getResend()) {
    return NextResponse.json(
      {
        error:
          "Password reset email is not configured. Add RESEND_API_KEY to .env.local.",
      },
      { status: 501 }
    )
  }

  const service = getResetServiceClient()
  if (!service) {
    return NextResponse.json(
      {
        error:
          "Password reset is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
      },
      { status: 501 }
    )
  }

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
  })

  if (linkError || !linkData.properties?.email_otp) {
    const resetToken = await createPasswordResetToken(email)
    return NextResponse.json({ ok: true, resetToken: resetToken ?? undefined })
  }

  try {
    await sendPasswordResetEmail(email, linkData.properties.email_otp)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reset code."
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const resetToken = await createPasswordResetToken(email)
  if (!resetToken) {
    return NextResponse.json(
      { error: "Could not start password reset. Try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, resetToken })
}
