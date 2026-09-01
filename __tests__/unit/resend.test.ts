/**
 * @jest-environment node
 */
import {
  formatResendError,
  isResendSandboxFrom,
  resolveResendRecipient,
} from "@/lib/resend"

describe("resend helpers", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development" }
    delete process.env.RESEND_DEV_REDIRECT_TO
    delete process.env.RESEND_FROM_EMAIL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("detects sandbox from address", () => {
    process.env.RESEND_FROM_EMAIL = "QFlow <onboarding@resend.dev>"
    expect(isResendSandboxFrom()).toBe(true)
  })

  it("redirects in dev when RESEND_DEV_REDIRECT_TO is set", () => {
    process.env.RESEND_DEV_REDIRECT_TO = "qflowdev668@gmail.com"
    const result = resolveResendRecipient("zanini@mailsac.com")
    expect(result.to).toBe("qflowdev668@gmail.com")
    expect(result.devRedirectedFrom).toBe("zanini@mailsac.com")
  })

  it("does not redirect in production", () => {
    process.env.NODE_ENV = "production"
    process.env.RESEND_DEV_REDIRECT_TO = "qflowdev668@gmail.com"
    const result = resolveResendRecipient("zanini@mailsac.com")
    expect(result.to).toBe("zanini@mailsac.com")
    expect(result.devRedirectedFrom).toBeUndefined()
  })

  it("formats sandbox restriction error", () => {
    const msg = formatResendError(
      "You can only send testing emails to your own email address (qflowdev668@gmail.com)."
    )
    expect(msg).toContain("RESEND_DEV_REDIRECT_TO")
    expect(msg).toContain("resend.com/domains")
  })
})
