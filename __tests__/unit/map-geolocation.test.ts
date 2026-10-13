/**
 * @jest-environment jsdom
 */
import {
  __resetGeoCacheForTests,
  accuracyCirclePolygon,
  detectUserLocation,
  LOW_ACCURACY_METERS,
  subscribeBetterFix,
} from "@/lib/map-geolocation"

describe("map-geolocation helpers", () => {
  it("keeps lat/lng named fields distinct (no swap)", () => {
    const circle = accuracyCirclePolygon({ lat: -26.2, lng: 28.05 }, 100)
    const [lng0, lat0] = circle.coordinates[0][0]
    // Ring stays near Johannesburg: lng ~28, lat ~-26
    expect(lng0).toBeGreaterThan(27)
    expect(lng0).toBeLessThan(29)
    expect(lat0).toBeLessThan(-25)
    expect(lat0).toBeGreaterThan(-27)
  })

  it("exports the low-accuracy threshold used by the map", () => {
    expect(LOW_ACCURACY_METERS).toBe(5000)
  })
})

describe("detectUserLocation", () => {
  const getCurrentPosition = jest.fn()

  beforeEach(() => {
    __resetGeoCacheForTests()
    getCurrentPosition.mockReset()
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    })
  })

  it("returns a network fix without waiting for a slow GPS lock", async () => {
    getCurrentPosition.mockImplementation(
      (success: PositionCallback, _error: PositionErrorCallback, options: PositionOptions) => {
        if (options.enableHighAccuracy) {
          setTimeout(() => {
            success({
              coords: { latitude: -26.2, longitude: 28.06, accuracy: 5 },
            } as GeolocationPosition)
          }, 0)
          return
        }
        success({
          coords: { latitude: -26.1, longitude: 28.05, accuracy: 30 },
        } as GeolocationPosition)
      }
    )

    const started = Date.now()
    const result = await detectUserLocation()
    expect(Date.now() - started).toBeLessThan(500)
    expect(result).toEqual({
      ok: true,
      coords: { lat: -26.1, lng: 28.05, accuracyMeters: 30 },
    })
    const quickCalls = getCurrentPosition.mock.calls.filter(
      (call) => call[2]?.enableHighAccuracy === false
    )
    expect(quickCalls).toHaveLength(1)
  })

  it("reuses the last fix so the next tap skips the browser", async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({
        coords: { latitude: -26.1, longitude: 28.05, accuracy: 30 },
      } as GeolocationPosition)
    })
    await detectUserLocation()
    getCurrentPosition.mockClear()
    const again = await detectUserLocation()
    expect(again).toMatchObject({ ok: true, coords: { lat: -26.1, lng: 28.05 } })
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it("replaces a rough first fix when GPS arrives, without another tap", async () => {
    const heard: Array<{ lat: number; lng: number }> = []
    const unsubscribe = subscribeBetterFix((coords) => {
      heard.push({ lat: coords.lat, lng: coords.lng })
    })
    getCurrentPosition.mockImplementation(
      (success: PositionCallback, _error: PositionErrorCallback, options: PositionOptions) => {
        if (options.enableHighAccuracy) {
          success({
            coords: { latitude: -26.2, longitude: 28.06, accuracy: 12 },
          } as GeolocationPosition)
          return
        }
        success({
          coords: { latitude: -26.1, longitude: 28.05, accuracy: 4000 },
        } as GeolocationPosition)
      }
    )

    const first = await detectUserLocation()
    expect(first).toMatchObject({ ok: true, coords: { lat: -26.1, lng: 28.05 } })
    expect(heard).toEqual([{ lat: -26.2, lng: 28.06 }])
    unsubscribe()
  })
})
