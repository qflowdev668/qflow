/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { MapScreen } from "@/components/qflow/screens/map-screen"
import {
  __resetActiveRouteStoreForTests,
  getActiveRoute,
  setActiveRoute,
  syncRouteToQueueLifecycle,
} from "@/lib/active-route-store"

const mockNavigateTo = jest.fn()
const mockSetSelectedLocation = jest.fn()
const mockDetectUserLocation = jest.fn()
const mockFetchMapboxRoute = jest.fn()

jest.mock("@/lib/map-geolocation", () => ({
  detectUserLocation: (...args: unknown[]) => mockDetectUserLocation(...args),
  locationBannerMessage: (reason: string) =>
    reason === "denied"
      ? "Location is blocked. Use the lock icon in the address bar → Site settings → Location → Allow, then tap Try again."
      : "Enable location to see distances and directions.",
  LOW_ACCURACY_METERS: 5000,
}))

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({
    locations: [
      {
        id: "loc-1",
        name: "Hillbrow Clinic",
        address: "1 Claim St",
        type: "clinic",
        queueCount: 5,
        capacity: 40,
        waitTime: 12,
        isOpen: true,
        coordinates: { lat: -26.192, lng: 28.048 },
      },
    ],
    navigateTo: mockNavigateTo,
    setSelectedLocation: mockSetSelectedLocation,
    selectedLocation: null,
    activeQueue: null,
    authError: null,
    clearAuthError: jest.fn(),
    joinQueue: jest.fn(),
  }),
}))

jest.mock("@/hooks/use-t", () => ({
  useT: () =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          const labels: Record<string, string> = {
            searchLocations: "Search locations",
            capacity: "Capacity",
            capacityLow: "Low",
            capacityModerate: "Moderate",
            capacityHigh: "High",
            capacityFullLegend: "Full",
            filterAll: "Show all places",
            filterAvailable: "Show places with space",
            filterBusy: "Show busy places",
            filterFull: "Show full places",
            joinQueue: "Join the line",
            getDirections: "Get directions",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/components/qflow/bottom-nav", () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}))

jest.mock("@/components/qflow/join-queue-drawer", () => ({
  JoinQueueDrawer: ({
    open,
    showDirections,
    onDirections,
    onOpenChange,
  }: {
    open: boolean
    showDirections?: boolean
    onDirections?: () => void
    onOpenChange?: (open: boolean) => void
  }) =>
    open ? (
      <div data-testid="join-drawer">
        {showDirections ? (
          <button type="button" data-testid="directions-button" onClick={onDirections}>
            Get directions
          </button>
        ) : null}
        <button
          type="button"
          data-testid="close-join-drawer"
          onClick={() => onOpenChange?.(false)}
        >
          Close
        </button>
      </div>
    ) : null,
}))

jest.mock("@/lib/mapbox-directions", () => ({
  fetchMapboxRoute: (...args: unknown[]) => mockFetchMapboxRoute(...args),
  formatRouteDistance: (m: number) => `${m} m`,
  formatRouteDuration: (s: number) => `${Math.round(s / 60)} min walk`,
  googleMapsDirectionsUrl: () => "https://maps.example",
}))

const mockQflowMapProps: { current: Record<string, unknown> } = { current: {} }

jest.mock("@/components/qflow/qflow-map", () => ({
  MAP_STYLE: "mapbox://styles/mapbox/streets-v12",
  QflowMap: (props: {
    onSelectLocation: (loc: { id: string; name: string }) => void
    locations: { id: string; name: string }[]
    userLocation?: { lat: number; lng: number } | null
  }) => {
    mockQflowMapProps.current = props as unknown as Record<string, unknown>
    return (
      <div data-testid="qflow-map-canvas">
        {props.userLocation ? (
          <div data-testid="map-user-location">
            {props.userLocation.lat},{props.userLocation.lng}
          </div>
        ) : null}
        {props.locations.map((loc) => (
          <button
            key={loc.id}
            type="button"
            data-testid={`map-pin-${loc.id}`}
            onClick={() => props.onSelectLocation(loc as never)}
          >
            {loc.name}
          </button>
        ))}
      </div>
    )
  },
}))

describe("MapScreen geolocation", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test-token"
    jest.clearAllMocks()
    mockQflowMapProps.current = {}
    window.localStorage.clear()
    __resetActiveRouteStoreForTests()
    mockFetchMapboxRoute.mockResolvedValue({
      ok: true,
      route: {
        distanceMeters: 1200,
        durationSeconds: 900,
        profile: "walking",
        geometry: {
          type: "LineString",
          coordinates: [
            [28.05, -26.1],
            [28.048, -26.192],
          ],
        },
      },
    })
  })

  it("updates the blue-dot position when geolocation is granted", async () => {
    mockDetectUserLocation.mockResolvedValue({
      ok: true,
      coords: { lat: -26.1, lng: 28.05 },
    })

    await act(async () => {
      render(<MapScreen />)
    })

    await waitFor(() => {
      expect(screen.getByTestId("map-user-location")).toHaveTextContent("-26.1,28.05")
    })
    expect(screen.queryByTestId("location-denied-banner")).toBeNull()
  })

  it("shows a banner when geolocation is denied and still renders the map", async () => {
    mockDetectUserLocation.mockResolvedValue({ ok: false, reason: "denied" })

    await act(async () => {
      render(<MapScreen />)
    })

    await waitFor(() => {
      expect(screen.getByTestId("location-denied-banner")).toBeTruthy()
    })
    expect(screen.getByText(/location is blocked/i)).toBeTruthy()
    expect(screen.getByTestId("location-try-again")).toBeTruthy()
    expect(screen.getByTestId("qflow-map-canvas")).toBeTruthy()
    expect(screen.queryByTestId("map-user-location")).toBeNull()
  })

  it("opens join drawer with Directions when location is available", async () => {
    mockDetectUserLocation.mockResolvedValue({
      ok: true,
      coords: { lat: -26.1, lng: 28.05 },
    })

    await act(async () => {
      render(<MapScreen />)
    })

    await waitFor(() => expect(screen.getByTestId("map-user-location")).toBeTruthy())
    fireEvent.click(screen.getByTestId("map-pin-loc-1"))
    expect(screen.getByTestId("join-drawer")).toBeTruthy()
    expect(screen.getByTestId("directions-button")).toBeTruthy()
  })

  it("keeps the route after the join sheet closes", async () => {
    mockDetectUserLocation.mockResolvedValue({
      ok: true,
      coords: { lat: -26.1, lng: 28.05 },
    })

    await act(async () => {
      render(<MapScreen />)
    })

    await waitFor(() => expect(screen.getByTestId("map-user-location")).toBeTruthy())
    fireEvent.click(screen.getByTestId("map-pin-loc-1"))
    fireEvent.click(screen.getByTestId("directions-button"))

    await waitFor(() => {
      expect(getActiveRoute()?.locationId).toBe("loc-1")
      expect(mockQflowMapProps.current.routeGeometry).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId("close-join-drawer"))
    expect(screen.queryByTestId("join-drawer")).toBeNull()
    expect(getActiveRoute()?.locationId).toBe("loc-1")
    expect(mockQflowMapProps.current.routeGeometry).toBeTruthy()
  })

  it("clears the route when the queue entry is no longer active", () => {
    setActiveRoute({
      queueEntryId: "qe-1",
      locationId: "loc-1",
      locationCoords: { lat: -26.192, lng: 28.048 },
      route: {
        distanceMeters: 1200,
        durationSeconds: 900,
        profile: "walking",
        geometry: {
          type: "LineString",
          coordinates: [
            [28.05, -26.1],
            [28.048, -26.192],
          ],
        },
      },
    })
    syncRouteToQueueLifecycle(null)
    expect(getActiveRoute()).toBeNull()
  })
})
