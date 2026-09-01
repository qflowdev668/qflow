import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAppMock, mockUseT, servingCustomer } from "../helpers/mock-app"

const appState = createAppMock({
  currentlyServing: servingCustomer("emergency"),
})

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () => appState,
}))

import { StaffServingScreen } from "@/components/qflow/screens/staff-serving-screen"

async function verifyPriority(user: ReturnType<typeof userEvent.setup>) {
  const proceed = screen.queryByRole("button", { name: /verified|proceed/i })
  if (proceed) await user.click(proceed)
}

describe("StaffServingScreen (Now Serving)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["setTimeout"] })
    Object.assign(appState, createAppMock())
    appState.refreshStaffQueue = jest.fn().mockResolvedValue(undefined)
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("emergency priority shows red header after verify", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    Object.assign(
      appState,
      createAppMock({ currentlyServing: servingCustomer("emergency") })
    )
    const { container } = render(<StaffServingScreen />)
    await verifyPriority(user)
    expect(container.innerHTML).toMatch(/EF4444/)
    expect(screen.getAllByText(/emergency/i).length).toBeGreaterThan(0)
  })

  it("fast-track shows amber header after verify", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    Object.assign(
      appState,
      createAppMock({ currentlyServing: servingCustomer("fast-track") })
    )
    const { container } = render(<StaffServingScreen />)
    await verifyPriority(user)
    expect(container.innerHTML).toMatch(/F59E0B/)
  })

  it("standard shows waiting / now-serving UI", () => {
    Object.assign(
      appState,
      createAppMock({ currentlyServing: servingCustomer("standard") })
    )
    render(<StaffServingScreen />)
    expect(
      screen.getAllByText(/waiting for customer|now serving|arrived/i).length
    ).toBeGreaterThan(0)
  })

  it("Service Complete button exists for emergency after verify", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    Object.assign(
      appState,
      createAppMock({ currentlyServing: servingCustomer("emergency") })
    )
    render(<StaffServingScreen />)
    await verifyPriority(user)
    expect(
      screen.getByRole("button", { name: /service complete|complete service/i })
    ).toBeInTheDocument()
  })

  it("Could Not Verify button exists for emergency", () => {
    Object.assign(
      appState,
      createAppMock({ currentlyServing: servingCustomer("emergency") })
    )
    render(<StaffServingScreen />)
    expect(screen.getAllByText(/could not verify/i).length).toBeGreaterThan(0)
  })

  it("no-show timer is shown for standard customers", () => {
    Object.assign(
      appState,
      createAppMock({ currentlyServing: servingCustomer("standard") })
    )
    render(<StaffServingScreen />)
    expect(screen.getAllByText(/3:00|waiting for customer/i).length).toBeGreaterThan(0)
  })
})
