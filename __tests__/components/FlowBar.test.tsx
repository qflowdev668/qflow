import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { detectUserLocation } from "@/lib/map-geolocation"
import { createAppMock, mockUseT, sampleLocation } from "../helpers/mock-app"
import type { QueueEntry } from "@/lib/app-context"

const leaveQueue = jest.fn()
const navigateTo = jest.fn()

function queueEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: "qe-1",
    locationId: sampleLocation.id,
    locationName: sampleLocation.name,
    locationAddress: sampleLocation.address,
    position: 7,
    totalInQueue: 12,
    estimatedWait: 14,
    status: "waiting",
    joinedAt: new Date(),
    priorityType: "standard",
    ...overrides,
  }
}

let activeQueue: QueueEntry | null = null

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () =>
    createAppMock({
      currentUser: {
        id: "user-1",
        name: "Test",
        email: "t@example.com",
        role: "user",
      },
      currentScreen: "home",
      activeQueue,
      leaveQueue,
      clearAuthError: jest.fn(),
      authError: null,
      selectedLocation: sampleLocation,
      locations: [sampleLocation],
      joinQueue: jest.fn(),
      navigateTo,
      setSelectedLocation: jest.fn(),
    }),
}))
jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
}))
jest.mock("@/lib/map-geolocation", () => ({
  detectUserLocation: jest.fn(async () => ({
    ok: true,
    coords: { lat: -26.18, lng: 28.04, accuracyMeters: 25 },
  })),
  subscribeBetterFix: jest.fn(() => () => {}),
}))
jest.mock("@/lib/mapbox-directions", () => ({
  fetchMapboxRoute: jest.fn(async () => ({ ok: false, error: "No route" })),
  formatRouteDistance: (m: number) => `${m} m`,
  formatRouteDuration: (s: number) => `${Math.round(s / 60)} min walk`,
  googleMapsDirectionsUrl: () => "https://maps.example",
  openDeviceMaps: jest.fn(),
}))
jest.mock("framer-motion", () => {
  const React = require("react")
  const passthrough = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement> & {
    layoutId?: string
    initial?: unknown
    animate?: unknown
    exit?: unknown
    transition?: unknown
    drag?: unknown
    dragConstraints?: unknown
    dragElastic?: unknown
    onDragEnd?: unknown
  }) => {
    const rest = { ...props }
    for (const key of [
      "layoutId",
      "initial",
      "animate",
      "exit",
      "transition",
      "drag",
      "dragConstraints",
      "dragElastic",
      "onDragEnd",
    ] as const) {
      delete rest[key]
    }
    return <div {...rest}>{children}</div>
  }
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: passthrough,
      button: ({
        children,
        ...props
      }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => {
        const cleaned = { ...props }
        delete cleaned.layoutId
        delete cleaned.initial
        delete cleaned.animate
        delete cleaned.exit
        delete cleaned.transition
        return <button {...cleaned}>{children}</button>
      },
      span: ({
        children,
        className,
      }: React.HTMLAttributes<HTMLSpanElement>) => (
        <span className={className}>{children}</span>
      ),
    },
    useReducedMotion: () => false,
  }
})

import { FlowBar } from "@/components/qflow/flow-bar"
import {
  __resetActiveRouteStoreForTests,
  getDirectionsJob,
  setActiveRoute,
} from "@/lib/active-route-store"

describe("FlowBar", () => {
  beforeEach(() => {
    activeQueue = null
    leaveQueue.mockClear()
    window.localStorage.clear()
    __resetActiveRouteStoreForTests()
  })

  it("renders nothing with no active queue entry", () => {
    const { container } = render(<FlowBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders collapsed state with an active queue", () => {
    activeQueue = queueEntry()
    render(<FlowBar />)
    const bar = screen.getByTestId("flow-bar")
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveAttribute("data-variant", "standard")
    expect(screen.getByText(sampleLocation.name)).toBeInTheDocument()
    expect(screen.getByTestId("roller-digit")).toHaveAttribute("data-value", "7")
  })

  it("expands and collapses via click", async () => {
    const user = userEvent.setup()
    activeQueue = queueEntry()
    render(<FlowBar />)

    await user.click(screen.getByTestId("flow-bar"))
    expect(await screen.findByTestId("flow-bar-expanded")).toBeInTheDocument()
    expect(screen.getByTestId("join-queue-panel")).toBeInTheDocument()
    expect(screen.getByTestId("ask-qflow-toggle")).toBeInTheDocument()

    await user.click(screen.getByLabelText(/close queue details/i))
    expect(await screen.findByTestId("flow-bar")).toBeInTheDocument()
    expect(screen.queryByTestId("flow-bar-expanded")).not.toBeInTheDocument()
  })

  it("shows Get directions in expanded state when no route is stored", async () => {
    const user = userEvent.setup()
    activeQueue = queueEntry()
    render(<FlowBar />)
    await user.click(screen.getByTestId("flow-bar"))
    expect(await screen.findByTestId("directions-button")).toBeInTheDocument()
    expect(screen.queryByTestId("route-summary-card")).not.toBeInTheDocument()
    await user.click(screen.getByTestId("directions-button"))
    expect(navigateTo).toHaveBeenCalledWith("map")
  })

  it("opens the map before a slow location fix resolves", async () => {
    let resolveGeo: (value: unknown) => void = () => {}
    ;(detectUserLocation as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGeo = resolve
        })
    )
    const user = userEvent.setup()
    activeQueue = queueEntry()
    navigateTo.mockClear()
    render(<FlowBar />)
    await user.click(screen.getByTestId("flow-bar"))
    expect(await screen.findByTestId("directions-button")).toBeInTheDocument()

    const started = Date.now()
    await user.click(screen.getByTestId("directions-button"))
    expect(navigateTo).toHaveBeenCalledWith("map")
    expect(getDirectionsJob()?.locationId).toBe(sampleLocation.id)
    expect(Date.now() - started).toBeLessThan(800)

    resolveGeo({
      ok: true,
      coords: { lat: -26.18, lng: 28.04, accuracyMeters: 25 },
    })
  })

  it("shows the walk on the queue bar when a route is active", async () => {
    activeQueue = queueEntry()
    setActiveRoute({
      queueEntryId: "qe-1",
      locationId: sampleLocation.id,
      locationCoords: sampleLocation.coordinates,
      route: {
        distanceMeters: 1200,
        durationSeconds: 900,
        profile: "walking",
        geometry: {
          type: "LineString",
          coordinates: [
            [28.04, -26.18],
            [28.05, -26.19],
          ],
        },
      },
    })
    render(<FlowBar />)
    const bar = screen.getByTestId("flow-bar")
    expect(bar).toHaveTextContent("1200 m")
    expect(bar).toHaveTextContent("15 min walk")
    expect(screen.queryByTestId("route-summary-card")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Walk" })).toBeInTheDocument()
  })

  it("shows distance/ETA in expanded state when a route is active", async () => {
    const user = userEvent.setup()
    activeQueue = queueEntry()
    setActiveRoute({
      queueEntryId: "qe-1",
      locationId: sampleLocation.id,
      locationCoords: sampleLocation.coordinates,
      route: {
        distanceMeters: 1200,
        durationSeconds: 900,
        profile: "walking",
        geometry: {
          type: "LineString",
          coordinates: [
            [28.04, -26.18],
            [28.05, -26.19],
          ],
        },
      },
    })
    render(<FlowBar />)
    await user.click(screen.getByTestId("flow-bar"))
    expect(await screen.findByTestId("flow-bar-expanded")).toBeInTheDocument()
    expect(screen.getByText("1200 m")).toBeInTheDocument()
    await user.click(screen.getByTestId("directions-button"))
    expect(navigateTo).toHaveBeenCalledWith("map")
  })

  it("applies emergency variant class", () => {
    activeQueue = queueEntry({ priorityType: "emergency" })
    render(<FlowBar />)
    expect(screen.getByTestId("flow-bar")).toHaveAttribute("data-variant", "emergency")
  })

  it("applies fast-track variant class", () => {
    activeQueue = queueEntry({ priorityType: "fast-track" })
    render(<FlowBar />)
    expect(screen.getByTestId("flow-bar")).toHaveAttribute("data-variant", "fast-track")
  })

  it("shows bell instead of position when it is your turn", () => {
    activeQueue = queueEntry({ status: "your-turn" })
    render(<FlowBar />)
    expect(screen.getByTestId("flow-bar")).toHaveAttribute("data-status", "your-turn")
    expect(screen.queryByTestId("roller-digit")).not.toBeInTheDocument()
  })
})
