import { applySessionExpiresInFromResponse, onSessionExpiresInHeader } from "@/lib/session-expiry-signal"

describe("session expiry signal", () => {
  afterEach(() => {
    onSessionExpiresInHeader(null)
  })

  it("notifies listeners from X-Session-Expires-In", () => {
    const seen: number[] = []
    onSessionExpiresInHeader((seconds) => seen.push(seconds))

    const headers = new Headers({ "X-Session-Expires-In": "240" })
    applySessionExpiresInFromResponse({ headers } as Response)

    expect(seen).toEqual([240])
  })

  it("ignores missing or invalid headers", () => {
    const seen: number[] = []
    onSessionExpiresInHeader((seconds) => seen.push(seconds))

    applySessionExpiresInFromResponse({ headers: new Headers() } as Response)
    applySessionExpiresInFromResponse({
      headers: new Headers({ "X-Session-Expires-In": "nope" }),
    } as Response)

    expect(seen).toEqual([])
  })
})
