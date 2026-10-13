/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { JoinQueuePanel } from "@/components/qflow/join-queue-panel"

var mockActiveQueue: {
  locationId: string
  locationName: string
  position: number
  status: string
} | null = null

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({
    joinQueue: jest.fn(),
    leaveQueue: jest.fn(),
    navigateTo: jest.fn(),
    selectedLocation: null,
    get activeQueue() {
      return mockActiveQueue
    },
    authError: null,
    clearAuthError: jest.fn(),
  }),
}))

jest.mock("@/hooks/use-t", () => ({
  useT: () =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          const labels: Record<string, string> = {
            estimatedWait: "Wait time",
            peopleAheadShort: "People in front",
            minUnit: "min",
            getDirections: "Get directions",
            qualifyForPriority: "Do you need priority help?",
            emergencyPriority: "Emergency",
            fastTrackPriority: "Fast-track",
            joinQueue: "Join the line",
            notAcceptingQueues: "Closed",
            queueIsFull: "Full",
            needInternetToJoin: "Need internet",
            youreInQueue: "In queue",
            leavingQueueWarning: "Leaving {name}",
            leaveCurrentJoinHere: "Leave current line and join here",
            priorityPolice: "Police",
            priorityParamedic: "Paramedic",
            priorityFirefighter: "Firefighter",
            priorityTraffic: "Traffic",
            priorityMilitary: "Military",
            priorityLearner: "Learner",
            priorityPregnant: "Pregnant",
            priorityDisability: "Disability",
            priorityElderly: "Elderly",
            priorityInfant: "Infant",
            priorityDistress: "Distress",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
}))

const location = {
  id: "loc-1",
  name: "Clinic",
  address: "1 St",
  type: "clinic" as const,
  queueCount: 2,
  capacity: 40,
  waitTime: 5,
  isOpen: true,
  distance: "1 km",
  coordinates: { lat: -26.2, lng: 28.0 },
}

describe("JoinQueuePanel switch lines", () => {
  afterEach(() => {
    mockActiveQueue = null
  })

  it("offers to leave the current line and join this place", () => {
    mockActiveQueue = {
      locationId: "loc-other",
      locationName: "ABSA Bank Sandton",
      position: 1,
      status: "waiting",
    }
    render(<JoinQueuePanel location={location} mode="join" />)
    expect(screen.getByRole("button", { name: "Leave current line and join here" })).toBeEnabled()
  })
})

describe("JoinQueuePanel Directions", () => {
  it("does not render Directions when showDirections is false", () => {
    render(<JoinQueuePanel location={location} mode="join" />)
    expect(screen.queryByTestId("directions-button")).toBeNull()
  })

  it("renders Directions only when location is available via showDirections", () => {
    const onDirections = jest.fn()
    render(
      <JoinQueuePanel
        location={location}
        mode="join"
        showDirections
        onDirections={onDirections}
      />
    )
    fireEvent.click(screen.getByTestId("directions-button"))
    expect(onDirections).toHaveBeenCalled()
  })
})
