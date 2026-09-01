import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAppMock, mockUseT, sampleLocation } from "../helpers/mock-app"

const appState = createAppMock({
  currentUser: {
    id: "admin-1",
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
  },
})

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () => appState,
}))
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => null,
}))

import { AdminDashboardScreen } from "@/components/qflow/screens/admin-dashboard-screen"

describe("AdminDashboardScreen", () => {
  beforeEach(() => {
    Object.assign(
      appState,
      createAppMock({
        currentUser: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
          role: "admin",
        },
        locations: [sampleLocation],
      })
    )
  })

  it("renders all 4 stat cards", () => {
    render(<AdminDashboardScreen />)
    expect(screen.getByText(/total locations/i)).toBeInTheDocument()
    expect(screen.getByText(/active queues/i)).toBeInTheDocument()
    expect(screen.getByText(/users today/i)).toBeInTheDocument()
    expect(screen.getByText(/staff accounts/i)).toBeInTheDocument()
  })

  it("locations list renders correctly", () => {
    render(<AdminDashboardScreen />)
    expect(screen.getAllByText("Hillbrow Clinic").length).toBeGreaterThan(0)
  })

  it("Add New button exists", () => {
    render(<AdminDashboardScreen />)
    expect(screen.getByRole("button", { name: /add new/i })).toBeInTheDocument()
  })

  it("edit/delete menu appears on ⋮ tap", async () => {
    const user = userEvent.setup()
    const { container } = render(<AdminDashboardScreen />)
    const menuBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      /ellipsis|more-vertical/i.test(b.innerHTML)
    )
    expect(menuBtn).toBeTruthy()
    await user.click(menuBtn as HTMLElement)
    expect(screen.getAllByText(/edit|delete/i).length).toBeGreaterThan(0)
  })
})
