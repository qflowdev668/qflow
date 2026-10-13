/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react"
import { JoinQueueDrawer } from "@/components/qflow/join-queue-drawer"

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({
    selectedLocation: {
      id: "loc-1",
      name: "Test Bank",
      type: "bank" as const,
      address: "1 Main St",
      queueCount: 0,
      capacity: 20,
      isOpen: true,
      coordinates: { lat: -26.1, lng: 28.0 },
    },
    clearAuthError: jest.fn(),
    joinQueue: jest.fn(),
    leaveQueue: jest.fn(),
    navigateTo: jest.fn(),
    activeQueue: null,
    authError: null,
  }),
}))

jest.mock("@/hooks/use-t", () => ({
  useT: () => ({
    noLocationSelected: "No location",
    goBackPickLocation: "Go back",
    estimatedWait: "Wait time",
    peopleAheadShort: "People in front",
    minUnit: "min",
    getDirections: "Get directions",
    qualifyForPriority: "Priority?",
    emergencyPriority: "Emergency",
    fastTrackPriority: "Fast track",
    joinQueue: "Join the line",
    joinAsEmergency: "Join as emergency",
    joinAsPriority: "Join as priority",
    notAcceptingQueues: "Closed",
    queueIsFull: "Full",
    needInternetToJoin: "Offline",
    youreInQueue: "Already in",
    leavingQueueWarning: "Leave {name}",
    myQueue: "My line",
    leaveQueue: "Leave",
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
  }),
}))

jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
}))

describe("JoinQueueDrawer", () => {
  it("renders join actions in the sheet body", async () => {
    const { findByTestId, findByText } = render(
      <JoinQueueDrawer open={true} onOpenChange={jest.fn()} />
    )
    expect(await findByTestId("join-queue-drawer")).toBeInTheDocument()
    expect(await findByTestId("service-icon-bank")).toBeInTheDocument()
    expect(await findByText("Join the line")).toBeInTheDocument()
    expect(await findByTestId("ask-qflow-toggle")).toBeInTheDocument()
  })

  it("anchors the sheet to the bottom of the viewport", async () => {
    const { findByTestId } = render(
      <JoinQueueDrawer open={true} onOpenChange={jest.fn()} />
    )
    const sheet = await findByTestId("join-queue-drawer")
    expect(sheet.className).toMatch(/bottom-0/)
    expect(sheet.className).not.toMatch(/bottom-\[72px\]/)
  })
})
