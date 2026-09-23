/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { MyQueueScreen } from "@/components/qflow/screens/my-queue-screen"
import { isAboutToBeCalled } from "@/lib/queue-next-state"
import type { QueueEntry } from "@/lib/app-context"
import { sampleLocation } from "../helpers/mock-app"

let activeQueue: QueueEntry | null = null
const leaveQueue = jest.fn()
const navigateTo = jest.fn()
const mockUseReducedMotion = jest.fn(() => false)

jest.mock("@/hooks/use-t", () => ({
  useT: () =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          const labels: Record<string, string> = {
            youreNext: "You're next!",
            anyMomentNow: "Any moment now",
            aboutToBeCalledTip:
              "Make your way to the counter now - you'll get an alert the moment it's your turn.",
            dismissTip: "Dismiss",
            youreInQueue: "You are in the line",
            personAheadLabel: "person in front",
            peopleAheadLabel: "people in front",
            position: "Your place",
            estimatedWait: "Wait time",
            waitLabel: "Wait",
            liveUpdates: "Updates are on",
            leaveQueue: "Leave the line",
            switchToSimpleView: "Simple view",
            switchToNormalView: "Normal view",
            yourNumber: "Your number",
            minutes: "min",
            keepTabOpenForTurn: "Keep this tab open",
            myQueue: "My line",
            noActiveQueue: "You are not in a line",
            noActiveQueueHint: "Find a place",
            findALocation: "Find a place",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({
    activeQueue,
    leaveQueue,
    navigateTo,
    accessibility: { textSize: "normal" },
    queueHistory: [],
    lastSyncedAt: null,
  }),
}))

jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
}))

jest.mock("@/components/qflow/bottom-nav", () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}))

jest.mock("framer-motion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

function entry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: "qe-1",
    locationId: sampleLocation.id,
    locationName: sampleLocation.name,
    locationAddress: sampleLocation.address,
    position: 1,
    totalInQueue: 5,
    estimatedWait: 0,
    status: "waiting",
    joinedAt: new Date(),
    priorityType: "standard",
    ...overrides,
  }
}

describe("isAboutToBeCalled", () => {
  it("is true only for position 1 while still waiting", () => {
    expect(isAboutToBeCalled(entry({ position: 1, status: "waiting" }))).toBe(true)
    expect(isAboutToBeCalled(entry({ position: 2, status: "waiting" }))).toBe(false)
    expect(isAboutToBeCalled(entry({ position: 1, status: "your-turn" }))).toBe(false)
    expect(isAboutToBeCalled(entry({ position: 1, status: "serving" }))).toBe(false)
    expect(isAboutToBeCalled(null)).toBe(false)
  })
})

describe("QueueStatusScreen (MyQueueScreen) about-to-be-called", () => {
  beforeEach(() => {
    activeQueue = null
    leaveQueue.mockClear()
    mockUseReducedMotion.mockReturnValue(false)
  })

  it("renders You're next treatment when position=1, peopleAhead=0, status=waiting", () => {
    activeQueue = entry({ position: 1, estimatedWait: 0, status: "waiting" })
    render(<MyQueueScreen />)

    expect(screen.getByTestId("queue-status-screen")).toHaveAttribute(
      "data-about-to-be-called",
      "true"
    )
    expect(screen.getByTestId("queue-status-banner")).toHaveTextContent("You're next!")
    expect(screen.getByTestId("any-moment-now")).toHaveTextContent("Any moment now")
    expect(screen.getByTestId("about-to-be-called-tip")).toBeInTheDocument()
    expect(screen.getByTestId("queue-place-ring")).toHaveAttribute("data-pulse", "true")
  })

  it("renders normal people-in-front treatment for other waiting positions", () => {
    activeQueue = entry({ position: 3, estimatedWait: 8, status: "waiting" })
    render(<MyQueueScreen />)

    expect(screen.getByTestId("queue-status-screen")).toHaveAttribute(
      "data-about-to-be-called",
      "false"
    )
    expect(screen.getByTestId("queue-status-banner")).toHaveTextContent("You are in the line")
    expect(screen.getByTestId("queue-status-banner")).toHaveTextContent("2 people in front")
    expect(screen.queryByTestId("any-moment-now")).not.toBeInTheDocument()
    expect(screen.queryByTestId("about-to-be-called-tip")).not.toBeInTheDocument()
  })

  it("does not use You're next when status is your-turn (Flow Bar territory)", () => {
    activeQueue = entry({ position: 1, status: "your-turn", estimatedWait: 0 })
    render(<MyQueueScreen />)

    expect(screen.getByTestId("queue-status-screen")).toHaveAttribute(
      "data-about-to-be-called",
      "false"
    )
    expect(screen.queryByText("You're next!")).not.toBeInTheDocument()
    expect(screen.queryByTestId("about-to-be-called-tip")).not.toBeInTheDocument()
  })

  it("dismisses the tip once per queue entry for the session", () => {
    activeQueue = entry({ position: 1, status: "waiting", estimatedWait: 0 })
    render(<MyQueueScreen />)

    expect(screen.getByTestId("about-to-be-called-tip")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Dismiss"))
    expect(screen.queryByTestId("about-to-be-called-tip")).not.toBeInTheDocument()
  })

  it("shows urgency treatment in big-text view when about to be called", () => {
    activeQueue = entry({ position: 1, status: "waiting", estimatedWait: 0 })
    render(<MyQueueScreen />)

    fireEvent.click(screen.getByRole("button", { name: "Simple view" }))

    expect(screen.getByTestId("queue-simple-view")).toHaveAttribute(
      "data-about-to-be-called",
      "true"
    )
    expect(screen.getByTestId("any-moment-now")).toHaveTextContent("Any moment now")
    expect(screen.getByTestId("queue-simple-number")).toHaveAttribute("data-pulse", "true")
    expect(screen.getByTestId("queue-simple-number").className).toMatch(/qflow-next-ring/)
    expect(screen.getByTestId("about-to-be-called-tip")).toBeInTheDocument()
    expect(screen.queryByText(/Wait:/i)).not.toBeInTheDocument()
  })

  it("keeps tip dismissed when switching between normal and big-text views", () => {
    activeQueue = entry({ position: 1, status: "waiting", estimatedWait: 0 })
    render(<MyQueueScreen />)

    fireEvent.click(screen.getByLabelText("Dismiss"))
    expect(screen.queryByTestId("about-to-be-called-tip")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Simple view" }))
    expect(screen.getByTestId("queue-simple-view")).toBeInTheDocument()
    expect(screen.queryByTestId("about-to-be-called-tip")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Normal view" }))
    expect(screen.getByTestId("queue-status-screen")).toBeInTheDocument()
    expect(screen.queryByTestId("about-to-be-called-tip")).not.toBeInTheDocument()
  })

  it("omits the pulse class when prefers-reduced-motion is set", () => {
    mockUseReducedMotion.mockReturnValue(true)
    activeQueue = entry({ position: 1, status: "waiting", estimatedWait: 0 })
    render(<MyQueueScreen />)

    expect(screen.getByTestId("queue-place-ring")).toHaveAttribute("data-pulse", "false")
    expect(screen.getByTestId("queue-place-ring").className).not.toMatch(/qflow-next-ring/)
    expect(screen.getByTestId("queue-status-banner")).toHaveTextContent("You're next!")

    fireEvent.click(screen.getByRole("button", { name: "Simple view" }))
    expect(screen.getByTestId("queue-simple-number")).toHaveAttribute("data-pulse", "false")
    expect(screen.getByTestId("queue-simple-number").className).not.toMatch(/qflow-next-ring/)
  })
})
