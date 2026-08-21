import { Resend } from "resend"

/** Server-only Resend client. Returns null when RESEND_API_KEY is missing. */
export function getResend() {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

export function getResendFrom() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "QFlow <onboarding@resend.dev>"
  )
}

type LoginCodeKind = "admin" | "staff"

export async function sendLoginCodeEmail(
  to: string,
  code: string,
  kind: LoginCodeKind = "admin"
) {
  const resend = getResend()
  if (!resend) {
    throw new Error(
      "Resend is not configured. Add RESEND_API_KEY to .env.local."
    )
  }

  const who = kind === "staff" ? "staff" : "admin"
  const title = kind === "staff" ? "QFlow staff sign-in" : "QFlow admin sign-in"

  const { error } = await resend.emails.send({
    from: getResendFrom(),
    to: [to],
    subject: `Your QFlow ${who} sign-in code`,
    text: [
      `Your QFlow ${who} sign-in code is: ${code}`,
      "",
      "This code expires in about 1 hour.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; color: #0f172a; margin: 0 0 12px;">${title}</h1>
        <p style="color: #475569; margin: 0 0 20px;">Use this code to finish signing in:</p>
        <p style="font-size: 32px; letter-spacing: 0.35em; font-weight: 700; color: #0f172a; margin: 0 0 20px;">${code}</p>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Expires in about 1 hour. If you did not request this, ignore this email.</p>
      </div>
    `,
  })

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend.")
  }
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const resend = getResend()
  if (!resend) {
    throw new Error(
      "Resend is not configured. Add RESEND_API_KEY to .env.local."
    )
  }

  const { error } = await resend.emails.send({
    from: getResendFrom(),
    to: [to],
    subject: "Your QFlow password reset code",
    text: [
      `Your QFlow password reset code is: ${code}`,
      "",
      "Enter this code in the app, then choose a new password.",
      "This is not a sign-in link. This code expires in about 1 hour.",
      "If you did not request a new password, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; color: #0f172a; margin: 0 0 12px;">Reset your QFlow password</h1>
        <p style="color: #475569; margin: 0 0 20px;">Enter this code in the app, then choose a new password. This is not a sign-in link.</p>
        <p style="font-size: 32px; letter-spacing: 0.35em; font-weight: 700; color: #0f172a; margin: 0 0 20px;">${code}</p>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Expires in about 1 hour. If you did not request this, ignore this email.</p>
      </div>
    `,
  })

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend.")
  }
}
