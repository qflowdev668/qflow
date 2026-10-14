import { exchangeAuthCodeOnce, resetAuthCodeExchange } from "@/lib/auth-code"

const PKCE = "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser."

function fakeClient(options: {
  session?: { user: { id: string } } | null
  sessionAfter?: { user: { id: string } } | null
  error?: { message: string } | null
}) {
  const exchange = jest.fn(async () => {
    if (options.sessionAfter) options.session = options.sessionAfter
    return { error: options.error ?? null }
  })
  const getSession = jest.fn(async () => ({
    data: { session: options.session ?? null },
  }))
  return {
    auth: { getSession, exchangeCodeForSession: exchange },
    exchange,
  }
}

describe("exchangeAuthCodeOnce", () => {
  beforeEach(() => {
    resetAuthCodeExchange()
  })

  it("exchanges one code once when the callback runs twice", async () => {
    const client = fakeClient({ error: null })
    const [first, second] = await Promise.all([
      exchangeAuthCodeOnce(client, "code-abc"),
      exchangeAuthCodeOnce(client, "code-abc"),
    ])

    expect(client.exchange).toHaveBeenCalledTimes(1)
    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
  })

  it("skips exchange when a session is already stored", async () => {
    const client = fakeClient({ session: { user: { id: "user-1" } } })
    const result = await exchangeAuthCodeOnce(client, "code-abc")

    expect(client.exchange).not.toHaveBeenCalled()
    expect(result.error).toBeNull()
  })

  it("treats a PKCE miss as success when a session exists afterwards", async () => {
    const client = fakeClient({
      error: { message: PKCE },
      sessionAfter: { user: { id: "user-1" } },
    })
    const result = await exchangeAuthCodeOnce(client, "code-abc")

    expect(client.exchange).toHaveBeenCalledTimes(1)
    expect(result.error).toBeNull()
  })

  it("returns a PKCE error when no session was created", async () => {
    const client = fakeClient({ error: { message: PKCE } })
    const result = await exchangeAuthCodeOnce(client, "code-abc")

    expect(result.error?.message).toMatch(/PKCE code verifier not found/)
  })
})
