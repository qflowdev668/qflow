/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { MapScreen } from "@/components/qflow/screens/map-screen"

const mockNavigateTo = jest.fn()
const mockSetSelectedLocation = jest.fn()

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
            waiting: "waiting",
            minUnit: "min",
            queueFull: "Full",
            queueIsFull: "Queue is full",
            spotsTaken: "{taken}/{total} taken",
            joinQueue: "Join the line",
            locations: "Locations",
            filterAll: "Show all places",
            filterAvailable: "Show places with space",
            filterBusy: "Show busy places",
            filterFull: "Show full places",
            openDirections: "Open directions",
            qualifyForPriority: "Do you need priority help?",
            estimatedWait: "Wait time",
            peopleAheadShort: "People in front",
            noLocationSelected: "No place selected",
            goBackPickLocation: "Go back and pick a place",
            notAcceptingQueues: "Closed",
            needInternetToJoin: "Need internet",
            youreInQueue: "You are in a line",
            leavingQueueWarning: "Leaving {name} at #{position}",
            emergencyPriority: "Emergency",
            fastTrackPriority: "Fast-track",
            joinAsEmergency: "Join as emergency",
            joinAsPriority: "Join as priority",
            myQueue: "My line",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/components/qflow/bottom-nav", () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}))

jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
}))

jest.mock("@/components/qflow/join-queue-drawer", () => ({
  JoinQueueDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-drawer">join-drawer</div> : null,
}))

describe("MapScreen button wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("cycles capacity filter when filter button is clicked", () => {
    render(<MapScreen />)
    const filter = screen.getByRole("button", { name: /show all places/i })
    fireEvent.click(filter)
    expect(screen.getByRole("button", { name: /show places with space/i })).toBeTruthy()
  })

  it("opens join drawer when a map pin is selected", () => {
    const { container } = render(<MapScreen />)
    const pin = container.querySelector("g.cursor-pointer")
    expect(pin).toBeTruthy()
    fireEvent.click(pin!)
    expect(mockSetSelectedLocation).toHaveBeenCalled()
    expect(screen.getByTestId("join-drawer")).toBeTruthy()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })
})
