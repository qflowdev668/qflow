import { destinationAfterSignIn, planAuthCallback, splashHoldMs } from "@/lib/auth-callback-flow"
import { authSplashIsActive, clearAuthSplash, markAuthSplash } from "@/lib/auth-splash"

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
})
