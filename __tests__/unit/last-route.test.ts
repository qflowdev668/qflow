import { LAST_ROUTE_KEY, readLastRoute, writeLastRoute } from "@/lib/routes"

describe("last-route auth params", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it("does not save or restore auth query params", () => {
    window.history.pushState(
      {},
      "",
      "/location/_/?id=loc-1&code=oauth-code&error=access_denied&error_description=nope&auth_error=PKCE&access_token=a&refresh_token=b"
    )

    writeLastRoute("/location/_/")

    expect(window.sessionStorage.getItem(LAST_ROUTE_KEY)).toBe("/location/_/?id=loc-1")
    expect(readLastRoute()).toBe("/location/_/?id=loc-1")
    expect(readLastRoute()).not.toContain("code=")
    expect(readLastRoute()).not.toContain("auth_error")
    expect(readLastRoute()).not.toContain("access_token")
    expect(readLastRoute()).not.toContain("refresh_token")
  })

  it("strips auth params already stored from an older session", () => {
    window.sessionStorage.setItem(
      LAST_ROUTE_KEY,
      "/login/?auth_error=PKCE%20code%20verifier%20not%20found&code=abc"
    )

    expect(readLastRoute()).toBe("/login/")
    expect(window.sessionStorage.getItem(LAST_ROUTE_KEY)).toBe("/login/")
  })
})
