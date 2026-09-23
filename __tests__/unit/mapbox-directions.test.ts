/**
 * @jest-environment jsdom
 */
import {
  formatRouteDistance,
  formatRouteDuration,
  googleMapsDirectionsUrl,
  fetchMapboxRoute,
} from "@/lib/mapbox-directions"

describe("mapbox-directions helpers", () => {
  it("formats distance and duration", () => {
    expect(formatRouteDistance(850)).toBe("850 m")
    expect(formatRouteDistance(1200)).toBe("1.2 km")
    expect(formatRouteDuration(900, "walking")).toBe("15 min walk")
    expect(formatRouteDuration(900, "driving")).toBe("15 min drive")
  })

  it("builds a Google Maps directions URL", () => {
    const url = googleMapsDirectionsUrl({ lat: -26.1, lng: 28.05 }, "walking")
    expect(url).toContain("destination=-26.1,28.05")
    expect(url).toContain("travelmode=walking")
  })

  it("calls Mapbox with longitude,latitude order (not lat,lng)", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            distance: 100,
            duration: 60,
            geometry: { type: "LineString", coordinates: [[28.05, -26.1]] },
          },
        ],
      }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await fetchMapboxRoute(
      { lat: -26.1, lng: 28.05 },
      { lat: -26.2, lng: 28.1 },
      "walking",
      "pk.test"
    )

    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain("28.05,-26.1;28.1,-26.2")
    expect(calledUrl).not.toContain("-26.1,28.05;-26.2,28.1")
  })
})
