import {
  googleOAuthSignInOptions,
  oauthCallbackRedirectUrl,
} from "@/lib/auth-redirect"

describe("auth redirect URLs", () => {
  it("builds callback URL from an explicit origin with trailing slash", () => {
    expect(oauthCallbackRedirectUrl("https://useqflow.app")).toBe(
      "https://useqflow.app/auth/callback/"
    )
    expect(oauthCallbackRedirectUrl("https://useqflow.app/")).toBe(
      "https://useqflow.app/auth/callback/"
    )
  })

  it("never hardcodes localhost:3000", () => {
    const opts = googleOAuthSignInOptions("https://useqflow.app")
    expect(opts.options.redirectTo).toBe("https://useqflow.app/auth/callback/")
    expect(opts.options.redirectTo).not.toContain("localhost:3000")
  })

  it("uses window.location.origin in the browser", () => {
    expect(oauthCallbackRedirectUrl()).toBe(`${window.location.origin}/auth/callback/`)
    expect(oauthCallbackRedirectUrl()).not.toContain("localhost:3000")
  })

  it("does not rewrite www into the apex host", () => {
    expect(oauthCallbackRedirectUrl("https://www.useqflow.app")).toBe(
      "https://www.useqflow.app/auth/callback/"
    )
    expect(oauthCallbackRedirectUrl("https://useqflow.app")).toBe(
      "https://useqflow.app/auth/callback/"
    )
  })

  it("passes redirectTo derived from origin to signInWithOAuth options", () => {
    const origin = "https://useqflow.app"
    const opts = googleOAuthSignInOptions(origin)
    expect(opts.provider).toBe("google")
    expect(opts.options.redirectTo).toBe(`${origin}/auth/callback/`)
    expect(opts.options.queryParams).toEqual({ prompt: "select_account" })
  })
})

describe("loginWithGoogle redirect contract", () => {
  it("mock signInWithOAuth receives dynamic origin, not localhost:3000", async () => {
    const signInWithOAuth = jest.fn().mockResolvedValue({ error: null })
    const origin = "https://useqflow.app"

    await signInWithOAuth(googleOAuthSignInOptions(origin))

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: expect.objectContaining({
          redirectTo: "https://useqflow.app/auth/callback/",
        }),
      })
    )
    const call = signInWithOAuth.mock.calls[0][0]
    expect(call.options.redirectTo).not.toContain("localhost:3000")
  })
})
