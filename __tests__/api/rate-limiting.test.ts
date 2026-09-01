/**
 * @jest-environment node
 */
jest.mock("@upstash/redis", () => ({
  Redis: { fromEnv: jest.fn() },
}))

jest.mock("@upstash/ratelimit", () => {
  const Ratelimit = Object.assign(
    jest.fn().mockImplementation(() => ({
      limit: jest.fn().mockResolvedValue({
        success: true,
        pending: Promise.resolve(),
      }),
    })),
    { slidingWindow: jest.fn(() => ({})) }
  )
  return { Ratelimit }
})

describe("OTP rate limiting via enforceOtpRateLimit", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = ""
    process.env.UPSTASH_REDIS_REST_TOKEN = ""
  })

  it("returns 429 after 3 OTP attempts for one phone", async () => {
    const { enforceOtpRateLimit } = await import("@/lib/rate-limit")
    const identity = `0825555${Date.now()}`
    const make = () =>
      new Request("http://localhost/api/admin/otp/send", {
        method: "POST",
        headers: { "x-forwarded-for": "10.0.0.50" },
      })

    for (let i = 0; i < 3; i++) {
      const ok = await enforceOtpRateLimit({
        request: make(),
        identity,
        identityKind: "phone",
        route: "/api/admin/otp/send",
      })
      expect(ok.ok).toBe(true)
    }

    const blocked = await enforceOtpRateLimit({
      request: make(),
      identity,
      identityKind: "phone",
      route: "/api/admin/otp/send",
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(429)
      const body = await blocked.response.json()
      expect(body.error).toMatch(/too many/i)
    }
  })
})
