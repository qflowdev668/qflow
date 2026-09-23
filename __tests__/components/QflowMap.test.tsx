/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { QflowMap } from "@/components/qflow/qflow-map"

jest.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}))

jest.mock("mapbox-gl", () => {
  const Map = jest.fn().mockImplementation(() => ({
    addControl: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    remove: jest.fn(),
    resize: jest.fn(),
    getStyle: jest.fn(() => ({ layers: [] })),
    setPaintProperty: jest.fn(),
    getZoom: jest.fn(() => 11),
    jumpTo: jest.fn(),
    flyTo: jest.fn(),
    fitBounds: jest.fn(),
    isStyleLoaded: jest.fn(() => true),
    getLayer: jest.fn(() => undefined),
    removeLayer: jest.fn(),
    getSource: jest.fn(() => undefined),
    removeSource: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
  }))
  const Marker = jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  }))
  return {
    __esModule: true,
    default: {
      accessToken: "",
      Map,
      Marker,
      NavigationControl: jest.fn(),
      LngLatBounds: jest.fn().mockImplementation(() => ({
        extend: jest.fn(),
      })),
    },
  }
})

const t = new Proxy({}, { get: (_o, p: string) => p }) as never

describe("QflowMap", () => {
  const prev = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  afterEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = prev
  })

  it("shows a fallback message when NEXT_PUBLIC_MAPBOX_TOKEN is missing", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ""
    render(
      <QflowMap
        locations={[]}
        selectedLocationId={null}
        onSelectLocation={jest.fn()}
        t={t}
      />
    )
    expect(screen.getByTestId("map-token-missing")).toBeTruthy()
    expect(screen.getByText(/map is unavailable/i)).toBeTruthy()
  })

  it("renders the map canvas container when a token is present", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test-token"
    render(
      <QflowMap
        locations={[
          {
            id: "loc-1",
            name: "Clinic",
            address: "1 St",
            type: "clinic",
            queueCount: 1,
            capacity: 10,
            waitTime: 5,
            isOpen: true,
            coordinates: { lat: -26.2, lng: 28.0 },
          } as never,
        ]}
        selectedLocationId={null}
        onSelectLocation={jest.fn()}
        t={t}
      />
    )
    expect(screen.getByTestId("qflow-map-canvas")).toBeTruthy()
    expect(screen.queryByTestId("map-token-missing")).toBeNull()
  })
})
