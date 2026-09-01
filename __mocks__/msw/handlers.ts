/**
 * MSW handler catalogue for optional client-side mocking.
 * Note: Jest setup does not auto-start MSW (MSW v2 ESM friction with Jest).
 * Import `server` from `./server` in a specific suite when needed, or use
 * Playwright + route mocking for E2E network stubs.
 */
import { http, HttpResponse } from "msw"

export const handlers = [
  http.get("/api/status", () =>
    HttpResponse.json({
      overall: "operational",
      components: [{ name: "App Server", status: "operational" }],
      checkedAt: new Date().toISOString(),
    })
  ),
  http.get("/api/display/:locationId", ({ params }) =>
    HttpResponse.json({
      locationId: params.locationId,
      locationName: "Hillbrow Clinic",
      nowServing: { ticket: "047", startedAt: new Date().toISOString() },
      recentlyCalled: [],
      updatedAt: new Date().toISOString(),
    })
  ),
  http.post("/api/queue/join", () =>
    HttpResponse.json({ ok: true, position: 5 })
  ),
]
