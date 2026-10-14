import { loginHref, loginHrefForStatus, resolveAuthGateStatus, type AuthGateInput } from "@/lib/auth-gate"

const PROTECTED = [
  "/home/",
  "/profile/",
  "/queue/",
  "/map/",
  "/notifications/",
  "/rate/",
  "/location/abc/",
  "/location/abc/join/",
  "/staff/",
  "/staff/serving/",
  "/admin/",
  "/admin/staff/",
  "/admin/admins/",
  "/admin/audit/",
  "/admin/locations/new/",
  "/profile/edit/",
  "/profile/accessibility/",
  "/profile/language/",
  "/profile/notifications/",
]

function gate(overrides: Partial<AuthGateInput> & Pick<AuthGateInput, "pathname">): AuthGateInput {
  return {
    authLoading: false,
    oauthPending: false,
    callbackPending: false,
    hasUser: false,
    sessionChecked: true,
    hasSession: false,
    holdForSession: false,
    ...overrides,
  }
}

describe("auth gate", () => {
  it("treats a null session during OAuth as still loading", () => {
    const state = resolveAuthGateStatus(
      gate({
        pathname: "/profile/",
        authLoading: true,
        oauthPending: true,
        callbackPending: true,
        sessionChecked: false,
        holdForSession: true,
      })
    )
    expect(state).toBe("loading")
    expect(loginHrefForStatus(state, "/profile/")).toBeNull()
    expect(loginHrefForStatus(state, "/home/")).toBeNull()
  })

  it.each(PROTECTED)("keeps %s off /login while the OAuth session is in flight", (pathname) => {
    const pending = resolveAuthGateStatus(
      gate({
        pathname,
        oauthPending: true,
        sessionChecked: false,
        holdForSession: true,
      })
    )
    const stored = resolveAuthGateStatus(
      gate({
        pathname,
        hasSession: true,
        holdForSession: true,
      })
    )
    const signedIn = resolveAuthGateStatus(gate({ pathname, hasUser: true, hasSession: true }))

    expect(pending).toBe("loading")
    expect(stored).toBe("authenticated")
    expect(signedIn).toBe("authenticated")
    expect(loginHrefForStatus(pending, pathname)).toBeNull()
    expect(loginHrefForStatus(stored, pathname)).toBeNull()
    expect(loginHrefForStatus(signedIn, pathname)).toBeNull()
  })

  it.each(PROTECTED)("sends a signed-out visit to %s back to login with returnUrl", (pathname) => {
    const signedOut = resolveAuthGateStatus(gate({ pathname }))
    expect(signedOut).toBe("unauthenticated")
    expect(loginHrefForStatus(signedOut, pathname)).toBe(
      `/login?returnUrl=${encodeURIComponent(pathname)}`
    )
  })

  it("does not attach returnUrl on public pages", () => {
    expect(loginHref("/login/")).toBe("/login")
    expect(loginHref("/help/")).toBe("/login")
    expect(loginHrefForStatus("unauthenticated", "/auth/callback/")).toBeNull()
    expect(loginHref(null, { auth_error: "That sign-in link expired. Please try again." })).toBe(
      `/login?auth_error=${encodeURIComponent("That sign-in link expired. Please try again.")}`
    )
  })
})
