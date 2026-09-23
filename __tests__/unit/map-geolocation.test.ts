/**
 * @jest-environment jsdom
 */
import {
  accuracyCirclePolygon,
  LOW_ACCURACY_METERS,
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
