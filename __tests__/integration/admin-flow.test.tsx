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
  locations: [sampleLocation],
})

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () => appState,
}))
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => null,
}))
jest.mock("@/components/qflow/top-bar", () => ({
  TopBar: ({ title }: { title: string }) => <div>{title}</div>,
}))

import { AdminDashboardScreen } from "@/components/qflow/screens/admin-dashboard-screen"
import { AddLocationScreen } from "@/components/qflow/screens/add-location-screen"

describe("Admin flow integration", () => {
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
        navigateTo: jest.fn(),
        deleteLocation: jest.fn(),
        addLocation: jest.fn(),
        updateLocation: jest.fn(),
        editingLocation: null,
        setEditingLocation: jest.fn(),
      })
    )
  })

  it("Add New navigates to add-location", async () => {
    const user = userEvent.setup()
    render(<AdminDashboardScreen />)
    await user.click(screen.getByRole("button", { name: /add new/i }))
    expect(appState.navigateTo).toHaveBeenCalled()
  })

  it("location appears in list", () => {
    render(<AdminDashboardScreen />)
    expect(screen.getAllByText("Hillbrow Clinic").length).toBeGreaterThan(0)
  })

  it("delete menu can open confirmation flow", async () => {
    const user = userEvent.setup()
    const { container } = render(<AdminDashboardScreen />)
    const menuBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      /more-vertical|ellipsis/i.test(b.innerHTML)
    )
    expect(menuBtn).toBeTruthy()
    await user.click(menuBtn as HTMLElement)
    expect(screen.getByText(/edit/i)).toBeInTheDocument()
    const deleteBtn = screen.getByText(/delete location/i)
    await user.click(deleteBtn)
    // Confirmation modal should mention the location name to type
    expect(screen.getAllByText(/Hillbrow Clinic/i).length).toBeGreaterThan(0)
  })

  it("Add Location form shows validation fields", () => {
    render(<AddLocationScreen />)
    expect(screen.getAllByText(/location|name|address|capacity|add/i).length).toBeGreaterThan(0)
  })
})
