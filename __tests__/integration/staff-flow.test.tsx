import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAppMock, mockUseT, servingCustomer } from "../helpers/mock-app"

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
  AddWalkInModal: () => null,
}))

import { StaffDashboardScreen } from "@/components/qflow/screens/staff-dashboard-screen"
import { StaffServingScreen } from "@/components/qflow/screens/staff-serving-screen"

describe("Staff flow integration", () => {
  beforeEach(() => {
    Object.assign(appState, createAppMock())
  })

  it("Call Next invokes callNext (→ Now Serving transition)", async () => {
    const user = userEvent.setup()
    render(<StaffDashboardScreen />)
    await user.click(screen.getByRole("button", { name: /call next/i }))
    expect(appState.callNext).toHaveBeenCalled()
  })

  it("Complete Service returns control via completeService", async () => {
    const user = userEvent.setup()
    Object.assign(
      appState,
      createAppMock({ currentlyServing: servingCustomer("emergency") })
    )
    render(<StaffServingScreen />)
    const proceed = screen.queryByRole("button", { name: /verified|proceed/i })
    if (proceed) await user.click(proceed)
    await user.click(
      screen.getByRole("button", { name: /service complete|complete service/i })
    )
    expect(appState.completeService).toHaveBeenCalled()
  })

  it("Take Break opens break controls / On Break state", () => {
    Object.assign(appState, createAppMock({ isOnBreak: true }))
    render(<StaffDashboardScreen />)
    expect(screen.getAllByText(/on break/i).length).toBeGreaterThan(0)
  })
})
