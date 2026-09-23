/**
 * @jest-environment jsdom
 */
import {
  __resetActiveRouteStoreForTests,
  clearActiveRoute,
  getActiveRoute,
  setActiveRoute,
  syncRouteToQueueLifecycle,
} from "@/lib/active-route-store"
import type { QueueEntry } from "@/lib/app-context"
import type { RouteSummary } from "@/lib/mapbox-directions"

const sampleRoute: RouteSummary = {
  distanceMeters: 1200,
  durationSeconds: 900,
  profile: "walking",
  geometry: {
    type: "LineString",
    coordinates: [
      [28.04, -26.14],
      [28.05, -26.15],
    ],
  },
}

function entry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: "qe-1",
    locationId: "loc-1",
    locationName: "Clinic",
    locationAddress: "1 St",
    position: 1,
    totalInQueue: 3,
    estimatedWait: 6,
    status: "waiting",
    joinedAt: new Date(),
    priorityType: "standard",
    ...overrides,
  }
}

describe("active-route-store", () => {
  beforeEach(() => {
    window.localStorage.clear()
    __resetActiveRouteStoreForTests()
  })

  it("persists a route to localStorage", () => {
    setActiveRoute({
      queueEntryId: "qe-1",
      locationId: "loc-1",
      locationCoords: { lat: -26.1, lng: 28.0 },
      route: sampleRoute,
    })
    const raw = window.localStorage.getItem("qflow-active-route-v1")
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).locationId).toBe("loc-1")
    expect(getActiveRoute()?.route.distanceMeters).toBe(1200)
  })

  it("clears when the active queue entry ends (leave / served / no-show)", () => {
    setActiveRoute({
      queueEntryId: "qe-1",
      locationId: "loc-1",
      locationCoords: { lat: -26.1, lng: 28.0 },
      route: sampleRoute,
    })

    syncRouteToQueueLifecycle(null)
    expect(getActiveRoute()).toBeNull()
  })

  it("clears when status is no longer an active Flow Bar status", () => {
    setActiveRoute({
      queueEntryId: "qe-1",
      locationId: "loc-1",
      locationCoords: { lat: -26.1, lng: 28.0 },
      route: sampleRoute,
    })
    syncRouteToQueueLifecycle(entry({ status: "served" }))
    expect(getActiveRoute()).toBeNull()
  })

  it("binds a preview route to the queue entry when the user joins that location", () => {
    setActiveRoute({
      queueEntryId: null,
      locationId: "loc-1",
      locationCoords: { lat: -26.1, lng: 28.0 },
      route: sampleRoute,
    })
    syncRouteToQueueLifecycle(entry({ id: "qe-9", locationId: "loc-1" }))
    expect(getActiveRoute()?.queueEntryId).toBe("qe-9")
  })

  it("clearActiveRoute removes storage", () => {
    setActiveRoute({
      queueEntryId: "qe-1",
      locationId: "loc-1",
      locationCoords: { lat: -26.1, lng: 28.0 },
      route: sampleRoute,
    })
    clearActiveRoute()
    expect(getActiveRoute()).toBeNull()
    expect(window.localStorage.getItem("qflow-active-route-v1")).toBeNull()
  })
})
