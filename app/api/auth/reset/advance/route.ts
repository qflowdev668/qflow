import { NextResponse } from "next/server"
import {
  consumePasswordResetToken,
  markPasswordResetVerified,
} from "@/lib/password-reset"

/** Mark OTP verified (after client verifyOtp) or consume after password update. */
export async function POST(request: Request) {
  let body: { rt?: string; action?: "verify" | "consume" }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const rt = body.rt?.trim()
  const action = body.action ?? "verify"
  if (!rt) {
    return NextResponse.json({ error: "Missing reset token." }, { status: 400 })
  }

  if (action === "consume") {
    await consumePasswordResetToken(rt)
    return NextResponse.json({ ok: true })
  }

  const row = await markPasswordResetVerified(rt)
  if (!row) {
    return NextResponse.json(
      { error: "This reset link expired or is invalid. Request a new code." },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, email: row.email, stage: row.stage })
}
