import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAppMock, mockUseT, sampleQueue } from "../helpers/mock-app"

const appState = createAppMock()

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () => appState,
}))
jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
}))
jest.mock("@/components/qflow/server-outage-banner", () => ({
  useServerOutage: () => ({ isServerDown: false }),
}))
jest.mock("@/components/qflow/add-walk-in-modal", () => ({
  AddWalkInModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="walk-in-modal">Walk-in Modal</div> : null,
}))

import { StaffDashboardScreen } from "@/components/qflow/screens/staff-dashboard-screen"

describe("StaffDashboardScreen", () => {
  beforeEach(() => {
    Object.assign(appState, createAppMock())
  })

  it("renders priority queue section", () => {
    render(<StaffDashboardScreen />)
    expect(screen.getByText(/priority queue/i)).toBeInTheDocument()
    expect(screen.getByText("Thabo")).toBeInTheDocument()
  })

  it("renders standard queue below priority", () => {
    render(<StaffDashboardScreen />)
    expect(screen.getByText("Sipho")).toBeInTheDocument()
  })

  it("Call Next button exists and is clickable", async () => {
    const user = userEvent.setup()
    render(<StaffDashboardScreen />)
    const btn = screen.getByRole("button", { name: /call next/i })
    expect(btn).toBeEnabled()
    await user.click(btn)
    expect(appState.callNext).toHaveBeenCalled()
  })

  it("Add Walk-in button exists", () => {
    render(<StaffDashboardScreen />)
    expect(
      screen.getByRole("button", { name: /walk-?in|add walk/i })
    ).toBeInTheDocument()
  })

  it("On Break state shows correctly", () => {
    Object.assign(appState, createAppMock({ isOnBreak: true }))
    render(<StaffDashboardScreen />)
    expect(screen.getAllByText(/on break/i).length).toBeGreaterThan(0)
  })

  it("stats cards render correct values", () => {
    render(<StaffDashboardScreen />)
    // waiting = priority + standard from sampleQueue (3)
    expect(screen.getByText(String(sampleQueue.length))).toBeInTheDocument()
    expect(screen.getByText("8")).toBeInTheDocument() // served
  })
})
