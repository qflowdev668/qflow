/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAppMock, mockUseT, sampleLocation } from "../helpers/mock-app"

const appState = createAppMock()

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () => appState,
}))
jest.mock("@/components/qflow/top-bar", () => ({
  TopBar: ({ title }: { title?: string }) => <div>{title}</div>,
}))

import { AddLocationScreen } from "@/components/qflow/screens/add-location-screen"
import { LocationDetailScreen } from "@/components/qflow/screens/location-detail-screen"

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "admin" as const,
}

const staff = {
  id: "staff-1",
  name: "Staff User",
  email: "staff@example.com",
  role: "staff" as const,
  locationId: "loc-1",
}

describe("required documents", () => {
  beforeEach(() => {
    Object.assign(
      appState,
      createAppMock({
        currentUser: staff,
        editingLocation: sampleLocation,
        selectedLocation: null,
        setSelectedLocation: jest.fn(),
        leaveQueue: jest.fn(),
        updateLocation: jest.fn(),
        addLocation: jest.fn(),
        setEditingLocation: jest.fn(),
        navigateTo: jest.fn(),
      })
    )
  })

  it("lets an admin save the documents field", async () => {
    const user = userEvent.setup()
    appState.currentUser = admin
    render(<AddLocationScreen />)

    const field = screen.getByLabelText("Documents required")
    await user.type(field, "Green ID book")
    expect(screen.getByTestId("documents-char-count")).toHaveTextContent("13 / 1,000")

    await user.click(screen.getByRole("button", { name: "Save Changes" }))
    expect(appState.updateLocation).toHaveBeenCalledWith(
      "loc-1",
      expect.objectContaining({ requiredDocuments: "Green ID book" })
    )
  })

  it("hides the documents field from staff", async () => {
    const user = userEvent.setup()
    render(<AddLocationScreen />)

    expect(screen.queryByLabelText("Documents required")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save Changes" }))
    const payload = appState.updateLocation.mock.calls[0][1] as { requiredDocuments?: string }
    expect(payload.requiredDocuments).toBeUndefined()
  })

  it("shows the list to a customer when it is set", () => {
    appState.selectedLocation = {
      ...sampleLocation,
      requiredDocuments: "Green ID book",
    }
    render(<LocationDetailScreen />)
    expect(screen.getByTestId("bring-with-you")).toHaveTextContent("Bring with you")
    expect(screen.getByTestId("bring-with-you")).toHaveTextContent("Green ID book")
  })

  it("hides the section when the list is empty", () => {
    appState.selectedLocation = { ...sampleLocation, requiredDocuments: "   " }
    render(<LocationDetailScreen />)
    expect(screen.queryByTestId("bring-with-you")).not.toBeInTheDocument()
    expect(screen.queryByText("Bring with you")).not.toBeInTheDocument()
  })
})
