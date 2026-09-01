import {
  privilegedGoogleBlockMessage,
  privilegedGoogleLoginScreen,
  shouldBlockPrivilegedGoogle,
} from "@/lib/privileged-session-guard"
import {
  clearAdminOtpConfirmed,
  markAdminOtpConfirmed,
} from "@/lib/privileged-login-confirmation"

describe("privileged session guard", () => {
  it("blocks Google sign-in for staff and admin roles", () => {
    const googleUser = {
      app_metadata: { provider: "google" },
      identities: [{ provider: "google" }],
    } as Parameters<typeof shouldBlockPrivilegedGoogle>[0]

    expect(shouldBlockPrivilegedGoogle(googleUser, "admin")).toBe(true)
    expect(shouldBlockPrivilegedGoogle(googleUser, "staff")).toBe(true)
    expect(shouldBlockPrivilegedGoogle(googleUser, "user")).toBe(false)
  })

  it("returns role-specific block messages", () => {
    expect(privilegedGoogleBlockMessage("admin")).toMatch(/cellphone/i)
    expect(privilegedGoogleBlockMessage("staff")).toMatch(/email and password/i)
    expect(privilegedGoogleLoginScreen("admin")).toBe("admin-phone-otp")
  })

  it("skips Google block for OTP-confirmed privileged sessions when requested", () => {
    const googleUser = {
      app_metadata: { provider: "google" },
      identities: [{ provider: "google" }],
    } as Parameters<typeof shouldBlockPrivilegedGoogle>[0]

    expect(shouldBlockPrivilegedGoogle(googleUser, "admin")).toBe(true)

    markAdminOtpConfirmed()
    expect(
      shouldBlockPrivilegedGoogle(googleUser, "admin", { respectOtpBypass: true })
    ).toBe(false)
    expect(shouldBlockPrivilegedGoogle(googleUser, "admin")).toBe(true)

    clearAdminOtpConfirmed()
  })
})
