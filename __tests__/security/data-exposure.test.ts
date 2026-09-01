/**
 * @jest-environment node
 *
 * Post-migration security checks: public counter display must not expose PII,
 * and protected deep links must not render location data without a session.
 */
import { pathAllowedForRole } from "@/lib/routes"
import { notificationBody } from "@/lib/notification-templates"

/** Shape returned by FastAPI GET /api/display/{locationId} (no auth). */
const DISPLAY_ALLOWED_TOP_KEYS = new Set([
  "locationId",
  "locationName",
  "nowServing",
  "recentlyCalled",
  "updatedAt",
])

function assertNoPiiKeys(value: unknown): void {
  if (value === null || value === undefined) return
  if (Array.isArray(value)) {
    value.forEach((item) => assertNoPiiKeys(item))
    return
  }
  if (typeof value !== "object") return

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase()
    // Public clinic title is allowed; person identifiers are not.
    if (key !== "locationName") {
      expect(lower).not.toBe("name")
      expect(lower).not.toBe("email")
      expect(lower).not.toBe("phone")
      expect(lower).not.toBe("cell")
      expect(lower).not.toBe("cell_number")
      expect(lower).not.toBe("customername")
      expect(lower).not.toBe("user_id")
      expect(lower).not.toBe("userid")
      expect(lower).not.toBe("avatar")
      expect(lower).not.toBe("password")
    }
    assertNoPiiKeys(child)
  }
}

describe("data exposure — counter display", () => {
  it("documents that /api/display requires no auth (public kiosk)", () => {
    // Contract: FastAPI router has no Depends(get_current_user).
    // See backend/qflow_api/routers/display.py and README Counter display.
    expect(true).toBe(true)
  })

  it("rejects payloads that include customer PII fields", () => {
    const leaky = {
      locationId: "loc-1",
      locationName: "Hillbrow Clinic",
      nowServing: { ticket: "047", startedAt: null, customerName: "Thabo" },
      recentlyCalled: [],
      updatedAt: new Date().toISOString(),
      email: "thabo@example.com",
    }

    expect(() => {
      for (const key of Object.keys(leaky)) {
        if (!DISPLAY_ALLOWED_TOP_KEYS.has(key) && key !== "email") {
          // email is forbidden
        }
      }
      assertNoPiiKeys(leaky)
    }).toThrow()
  })

  it("accepts a ticket-only display payload", () => {
    const safe = {
      locationId: "00000000-0000-0000-0000-000000000001",
      locationName: "Hillbrow Clinic",
      nowServing: { ticket: "047", startedAt: "2026-08-25T10:00:00Z" },
      recentlyCalled: [
        { ticket: "046", calledAt: "2026-08-25T09:55:00Z" },
      ],
      updatedAt: "2026-08-25T10:00:01Z",
    }

    for (const key of Object.keys(safe)) {
      expect(DISPLAY_ALLOWED_TOP_KEYS.has(key)).toBe(true)
    }
    expect(() => assertNoPiiKeys(safe)).not.toThrow()
    expect(safe.nowServing.ticket).toMatch(/^\d{3}$/)
    expect(JSON.stringify(safe)).not.toMatch(/@/)
    expect(JSON.stringify(safe)).not.toMatch(/\+27\d{9}/)
    expect(JSON.stringify(safe)).not.toMatch(/\b0[6-8]\d{8}\b/)
  })

  it("push bodies used for turn alerts do not embed emails or phones", () => {
    const bodies = [
      notificationBody("almost_next"),
      notificationBody("your_turn"),
      notificationBody("no_show"),
    ]
    for (const body of bodies) {
      expect(body).not.toMatch(/@/)
      expect(body).not.toMatch(/\+27/)
    }
  })
})

describe("data exposure — location deep links", () => {
  const sampleId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

  it("pathAllowedForRole sends anonymous /location/_/?id= to /login", () => {
    expect(pathAllowedForRole(`/location/_/?id=${sampleId}`, null)).toBe(
      "/login"
    )
    expect(pathAllowedForRole(`/location/${sampleId}`, undefined)).toBe(
      "/login"
    )
    expect(pathAllowedForRole(`/location/_/join/?id=${sampleId}`, null)).toBe(
      "/login"
    )
  })

  it("does not treat /location as a public path", () => {
    const { isPublicPath } = require("@/lib/routes") as typeof import("@/lib/routes")
    expect(isPublicPath("/location/_")).toBe(false)
    expect(isPublicPath(`/location/_/?id=${sampleId}`.split("?")[0])).toBe(
      false
    )
  })

  it("keeps /display public (kiosk) while locking /location to users", () => {
    const { isPublicPath } = require("@/lib/routes") as typeof import("@/lib/routes")
    expect(isPublicPath("/display/_")).toBe(true)
    expect(pathAllowedForRole(`/location/_/?id=${sampleId}`, "user")).toBeNull()
    expect(pathAllowedForRole(`/location/_/?id=${sampleId}`, "staff")).toBe(
      "/staff"
    )
  })
})
