/**
 * @jest-environment node
 */
import { isQueueApiEnabled } from "@/lib/queue-api-proxy"

describe("queue-api-proxy", () => {
  const original = process.env.QUEUE_API_URL

  afterEach(() => {
    if (original === undefined) delete process.env.QUEUE_API_URL
    else process.env.QUEUE_API_URL = original
  })

  it("is disabled without QUEUE_API_URL", () => {
    delete process.env.QUEUE_API_URL
    expect(isQueueApiEnabled()).toBe(false)
  })

  it("is enabled when QUEUE_API_URL is set", () => {
    process.env.QUEUE_API_URL = "http://localhost:8000"
    expect(isQueueApiEnabled()).toBe(true)
  })
})
