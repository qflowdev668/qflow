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

/** True when using Resend's default sandbox sender (limited recipients). */
export function isResendSandboxFrom(): boolean {
  const from = getResendFrom().toLowerCase()
  return from.includes("@resend.dev")
}

/**
 * Local dev: redirect all OTP emails to your Resend account inbox so staff
 * accounts can use any email address while testing.
 * Set RESEND_DEV_REDIRECT_TO=qflowdev668@gmail.com in .env.local
 */
export function resolveResendRecipient(intended: string): {
  to: string
  devRedirectedFrom?: string
} {
  const normalized = intended.trim().toLowerCase()
  const redirect = process.env.RESEND_DEV_REDIRECT_TO?.trim().toLowerCase()

  if (
    process.env.NODE_ENV !== "production" &&
    redirect &&
    normalized !== redirect
  ) {
    return { to: redirect, devRedirectedFrom: normalized }
  }

  return { to: normalized }
}

export function formatResendError(message: string): string {
  if (/only send testing emails to your own email/i.test(message)) {
    return [
      "Resend test mode: emails can only go to your Resend account address right now.",
      "",
      "Quick fixes:",
      "• Local dev — add RESEND_DEV_REDIRECT_TO=qflowdev668@gmail.com to .env.local and restart npm run dev",
      "• Or create the staff account with email qflowdev668@gmail.com",
      "• Production — verify your domain at resend.com/domains and set RESEND_FROM_EMAIL to that domain",
    ].join("\n")
  }
  return message
}

type LoginCodeKind = "admin" | "staff"

function buildDevRedirectNote(devRedirectedFrom?: string): string {
  if (!devRedirectedFrom) return ""
  return [
    "",
    `[Dev] This code was requested for ${devRedirectedFrom}. You are receiving it because RESEND_DEV_REDIRECT_TO is set.`,
  ].join("\n")
}

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

  const { to: recipient, devRedirectedFrom } = resolveResendRecipient(to)
  const who = kind === "staff" ? "staff" : "admin"
  const title = kind === "staff" ? "QFlow staff sign-in" : "QFlow admin sign-in"
  const devNote = buildDevRedirectNote(devRedirectedFrom)
  const devHtml = devRedirectedFrom
    ? `<p style="color: #b45309; font-size: 13px; margin: 16px 0 0;">Dev redirect: code requested for <strong>${devRedirectedFrom}</strong></p>`
    : ""

  const { error } = await resend.emails.send({
    from: getResendFrom(),
    to: [recipient],
    subject: `Your QFlow ${who} sign-in code`,
    text: [
      `Your QFlow ${who} sign-in code is: ${code}`,
      "",
      "This code expires in about 1 hour.",
      "If you did not request this, you can ignore this email.",
      devNote,
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; color: #0f172a; margin: 0 0 12px;">${title}</h1>
        <p style="color: #475569; margin: 0 0 20px;">Use this code to finish signing in:</p>
        <p style="font-size: 32px; letter-spacing: 0.35em; font-weight: 700; color: #0f172a; margin: 0 0 20px;">${code}</p>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Expires in about 1 hour. If you did not request this, ignore this email.</p>
        ${devHtml}
      </div>
    `,
  })

  if (error) {
    throw new Error(formatResendError(error.message || "Failed to send email via Resend."))
  }
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const resend = getResend()
  if (!resend) {
    throw new Error(
      "Resend is not configured. Add RESEND_API_KEY to .env.local."
    )
  }

  const { to: recipient, devRedirectedFrom } = resolveResendRecipient(to)
  const devNote = buildDevRedirectNote(devRedirectedFrom)
  const devHtml = devRedirectedFrom
    ? `<p style="color: #b45309; font-size: 13px; margin: 16px 0 0;">Dev redirect: code requested for <strong>${devRedirectedFrom}</strong></p>`
    : ""

  const { error } = await resend.emails.send({
    from: getResendFrom(),
    to: [recipient],
    subject: "Your QFlow password reset code",
    text: [
      `Your QFlow password reset code is: ${code}`,
      "",
      "Enter this code in the app, then choose a new password.",
      "This is not a sign-in link. This code expires in about 1 hour.",
      "If you did not request a new password, you can ignore this email.",
      devNote,
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; color: #0f172a; margin: 0 0 12px;">Reset your QFlow password</h1>
        <p style="color: #475569; margin: 0 0 20px;">Enter this code in the app, then choose a new password. This is not a sign-in link.</p>
        <p style="font-size: 32px; letter-spacing: 0.35em; font-weight: 700; color: #0f172a; margin: 0 0 20px;">${code}</p>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Expires in about 1 hour. If you did not request this, ignore this email.</p>
        ${devHtml}
      </div>
    `,
  })

  if (error) {
    throw new Error(formatResendError(error.message || "Failed to send email via Resend."))
  }
}
