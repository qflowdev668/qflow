import {
  destinationAfterSignIn,
  firstNameFromSessionUser,
  isCustomerHomePath,
  loginRedirectFor,
  noteAuthEvent,
  hasStoredAuthSession,
  planAuthCallback,
  splashHoldMs,
} from "@/lib/auth-callback-flow"
import { authSplashIsActive, clearAuthSplash, markAuthSplash } from "@/lib/auth-splash"
import { screenFromPath } from "@/lib/routes"

describe("planAuthCallback", () => {
  it("exchanges a code when the callback has no error", () => {
    const plan = planAuthCallback(new URLSearchParams("code=abc"), false)
    expect(plan).toEqual({ kind: "exchange", code: "abc" })
  })

  it("enters the app when an error param arrives with a session", () => {
    const plan = planAuthCallback(
      new URLSearchParams("error=access_denied&error_code=bad_oauth_state&error_description=OAuth+state+not+found"),
      true
    )
    expect(plan).toEqual({ kind: "enter" })
  })

  it("treats an error param without a session as an expired link", () => {
    const plan = planAuthCallback(
      new URLSearchParams("error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired"),
      false
    )
    expect(plan).toEqual({ kind: "expired" })
  })

  it("holds the splash for the remainder of the minimum time", () => {
    expect(splashHoldMs(1000, 1100)).toBe(300)
    expect(splashHoldMs(1000, 1500)).toBe(0)
  })

  it("does not send a null INITIAL_SESSION to login when SIGNED_IN follows", () => {
    let state = { resolved: false, hasUser: false, awaitingSignIn: false }
    state = noteAuthEvent(state, {
      type: "INITIAL_SESSION",
      hasSession: false,
      callbackPending: true,
    })
    expect(loginRedirectFor(state, "/home")).toBeNull()
    expect(loginRedirectFor(state, "/auth/callback")).toBeNull()

    state = noteAuthEvent(state, {
      type: "SIGNED_IN",
      hasSession: true,
      callbackPending: true,
    })
    expect(state.hasUser).toBe(true)
    expect(loginRedirectFor(state, "/home")).toBeNull()
  })

  it("redirects to login only after auth resolves with no session", () => {
    const signedOut = noteAuthEvent(
      { resolved: false, hasUser: false, awaitingSignIn: false },
      { type: "INITIAL_SESSION", hasSession: false, callbackPending: false }
    )
    expect(loginRedirectFor(signedOut, "/home")).toBe("/login")
    expect(loginRedirectFor(signedOut, "/login")).toBeNull()
    expect(
      loginRedirectFor({ resolved: false, hasUser: false, awaitingSignIn: false }, "/home")
    ).toBeNull()
  })

  it("treats only customer Home as the Home skeleton destination", () => {
    expect(isCustomerHomePath("/home")).toBe(true)
    expect(isCustomerHomePath("/home/")).toBe(true)
    expect(isCustomerHomePath("/home?toast=1")).toBe(true)
    expect(isCustomerHomePath("/map")).toBe(false)
    expect(isCustomerHomePath("/location/abc")).toBe(false)
    expect(isCustomerHomePath("/staff")).toBe(false)
    expect(isCustomerHomePath("/admin")).toBe(false)
  })

  it("does not treat the callback route as the startup splash", () => {
    expect(screenFromPath("/auth/callback/")).toBe("auth-callback")
    expect(screenFromPath("/auth/callback")).toBe("auth-callback")
  })

  it("reads a cached first name without waiting for a profile", () => {
    expect(firstNameFromSessionUser(null)).toBeNull()
    expect(firstNameFromSessionUser({ user_metadata: {} })).toBeNull()
    expect(firstNameFromSessionUser({ user_metadata: { given_name: "Thandi" } })).toBe("Thandi")
    expect(firstNameFromSessionUser({ user_metadata: { name: "Thandi Mkhize" } })).toBe("Thandi")
  })

  it("sends a signed-in user to home instead of the startup splash", () => {
    expect(destinationAfterSignIn("user", "/")).toBe("/home")
    expect(destinationAfterSignIn("user", null)).toBe("/home")
  })
})

describe("auth splash flag", () => {
  beforeEach(() => {
    clearAuthSplash()
  })

  it("ignores a storage API that throws", () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })

    expect(() => markAuthSplash()).not.toThrow()
    expect(authSplashIsActive()).toBe(false)

    setItem.mockRestore()
    getItem.mockRestore()
  })

  it("marks a fresh sign-in splash", () => {
    markAuthSplash()
    expect(authSplashIsActive()).toBe(true)
    clearAuthSplash()
    expect(authSplashIsActive()).toBe(false)
  })

  it("notices a stored auth cookie without calling getSession", () => {
    document.cookie = "qflow-auth=session; path=/"
    expect(hasStoredAuthSession()).toBe(true)
  })
})
