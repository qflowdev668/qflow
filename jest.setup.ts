import "@testing-library/jest-dom"
import { TextEncoder, TextDecoder } from "util"

// Force in-memory rate limits in Jest (ignore local Upstash credentials).
process.env.UPSTASH_REDIS_REST_URL = ""
process.env.UPSTASH_REDIS_REST_TOKEN = ""

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
})

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

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
  default: (props: any) => {
    const React = require("react")
    return React.createElement("img", { ...props, alt: props.alt ?? "" })
  },
}))

const originalError = console.error
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Warning:")) return
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})
