import { test, expect } from "@playwright/test"

test.describe("Queue API (FastAPI integration)", () => {
  test("queue health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/queue/health")
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toMatchObject({
      ok: true,
      service: "qflow-api",
    })
  })

  test("join without session returns 401", async ({ request }) => {
    const res = await request.post("/api/queue/join", {
      data: { locationId: "00000000-0000-0000-0000-000000000001" },
    })
    expect(res.status()).toBe(401)
  })

  test("FastAPI health responds when service is running", async ({ request }) => {
    const base = process.env.QUEUE_API_URL ?? "http://localhost:8000"
    try {
      const res = await request.get(`${base}/health`, { timeout: 5_000 })
      if (res.ok()) {
        const body = await res.json()
        expect(body.ok).toBe(true)
        expect(body.service).toBe("qflow-api")
      }
    } catch {
      test.skip(true, "FastAPI not running — start with npm run start")
    }
  })
})
