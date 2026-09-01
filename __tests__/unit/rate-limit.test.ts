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

import {
  enforceOtpRateLimit,
  clientIp,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit"

describe("Rate limiter (enforceOtpRateLimit)", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = ""
    process.env.UPSTASH_REDIS_REST_TOKEN = ""
    jest.useFakeTimers({ now: Date.now() })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  function req(ip = "203.0.113.10") {
    return new Request("http://localhost/api/admin/otp/send", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
    })
  }

  it("allows requests under the identity limit", async () => {
    const result = await enforceOtpRateLimit({
      request: req("203.0.113.1"),
      identity: `0821111${Date.now()}`,
      identityKind: "phone",
      route: "/api/admin/otp/send",
    })
    expect(result.ok).toBe(true)
  })

  it("blocks after 3 OTP requests for the same identity in 15 minutes", async () => {
    const identity = `0822222${Date.now()}`
    const ip = "203.0.113.22"
    for (let i = 0; i < 3; i++) {
      const ok = await enforceOtpRateLimit({
        request: req(ip),
        identity,
        identityKind: "phone",
        route: "/api/admin/otp/send",
      })
      expect(ok.ok).toBe(true)
    }
    const blocked = await enforceOtpRateLimit({
      request: req(ip),
      identity,
      identityKind: "phone",
      route: "/api/admin/otp/send",
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(429)
      const body = await blocked.response.json()
      expect(body.error).toBe(RATE_LIMIT_MESSAGE)
    }
  })

  it("blocks after 10 requests per IP per hour", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200)}`
    const stamp = Date.now()
    for (let i = 0; i < 10; i++) {
      const result = await enforceOtpRateLimit({
        request: req(ip),
        identity: `083${stamp}${i}`,
        identityKind: "phone",
        route: "/api/admin/otp/send",
      })
      expect(result.ok).toBe(true)
    }
    const blocked = await enforceOtpRateLimit({
      request: req(ip),
      identity: `083${stamp}999`,
      identityKind: "phone",
      route: "/api/admin/otp/send",
    })
    expect(blocked.ok).toBe(false)
  })

  it("resets identity limit after the window expires", async () => {
    const identity = `0844444${Date.now()}`
    const ip = "203.0.113.44"
    for (let i = 0; i < 3; i++) {
      await enforceOtpRateLimit({
        request: req(ip),
        identity,
        identityKind: "phone",
        route: "/api/admin/otp/send",
      })
    }
    jest.advanceTimersByTime(16 * 60 * 1000)
    const result = await enforceOtpRateLimit({
      request: req(ip),
      identity,
      identityKind: "phone",
      route: "/api/admin/otp/send",
    })
    expect(result.ok).toBe(true)
  })

  it("keeps separate buckets for different identities", async () => {
    const stamp = Date.now()
    const ip = "203.0.113.55"
    for (let i = 0; i < 3; i++) {
      await enforceOtpRateLimit({
        request: req(ip),
        identity: `0855555${stamp}a`,
        identityKind: "phone",
        route: "/api/admin/otp/send",
      })
    }
    const other = await enforceOtpRateLimit({
      request: req(ip),
      identity: `0855555${stamp}b`,
      identityKind: "phone",
      route: "/api/admin/otp/send",
    })
    expect(other.ok).toBe(true)
  })

  it("parses client IP from x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "198.51.100.9, 10.0.0.1" },
    })
    expect(clientIp(request)).toBe("198.51.100.9")
  })

  it("uses in-memory fallback when Upstash not configured", async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const result = await enforceOtpRateLimit({
      request: req("203.0.113.90"),
      identity: `fallback-${Date.now()}`,
      identityKind: "phone",
      route: "/api/admin/otp/send",
    })
    expect(result.ok).toBe(true)

    process.env.UPSTASH_REDIS_REST_URL = originalUrl
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken
  })

  it("falls back to x-real-ip when forwarded-for is absent", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.44" },
    })
    expect(clientIp(request)).toBe("198.51.100.44")
  })

  it("returns unknown when no IP headers are present", () => {
    expect(clientIp(new Request("http://localhost"))).toBe("unknown")
  })

  it("blocks by identity when IP is under limit (email kind)", async () => {
    const identity = `fallback-email-${Date.now()}@example.com`
    const ip = "203.0.113.91"
    for (let i = 0; i < 3; i++) {
      await enforceOtpRateLimit({
        request: req(ip),
        identity,
        identityKind: "email",
        route: "/api/auth/reset/send",
      })
    }
    const blocked = await enforceOtpRateLimit({
      request: req(ip),
      identity,
      identityKind: "email",
      route: "/api/auth/reset/send",
    })
    expect(blocked.ok).toBe(false)
  })
})
