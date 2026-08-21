import { NextResponse } from "next/server"
import { getPasswordResetToken } from "@/lib/password-reset"

/** Look up an active password-reset token for UI (email + stage). */
export async function GET(request: Request) {
  const rt = new URL(request.url).searchParams.get("rt")?.trim()
  if (!rt) {
    return NextResponse.json({ error: "Missing reset token." }, { status: 400 })
  }

  const row = await getPasswordResetToken(rt)
  if (!row) {
    return NextResponse.json(
      { error: "This reset link expired or is invalid. Request a new code." },
      { status: 404 }
    )
  }

  return NextResponse.json({
    email: row.email,
    stage: row.stage,
  })
}
