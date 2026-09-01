import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAppMock, mockUseT } from "../helpers/mock-app"

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () => createAppMock({ locationQueue: [] }),
}))

import { AddWalkInModal } from "@/components/qflow/add-walk-in-modal"

describe("AddWalkInModal", () => {
  const onClose = jest.fn()
  const onAddCustomer = jest.fn().mockResolvedValue({ id: "w1", position: 4 })

  beforeEach(() => {
    onClose.mockClear()
    onAddCustomer.mockClear()
  })

  it("name field is required / Add to Queue disabled without name", () => {
    render(
      <AddWalkInModal isOpen onClose={onClose} onAddCustomer={onAddCustomer} />
    )
    const addBtn = screen.getByRole("button", { name: /add to queue/i })
    expect(addBtn).toBeDisabled()
  })

  it("enables Add to Queue after typing a name", async () => {
    const user = userEvent.setup()
    render(
      <AddWalkInModal isOpen onClose={onClose} onAddCustomer={onAddCustomer} />
    )
    const nameInput =
      screen.getByPlaceholderText(/name/i) ||
      screen.getByRole("textbox")
    await user.type(nameInput, "Walk In Customer")
    expect(screen.getByRole("button", { name: /add to queue/i })).toBeEnabled()
  })

  it("emergency priority options render", () => {
    render(
      <AddWalkInModal isOpen onClose={onClose} onAddCustomer={onAddCustomer} />
    )
    expect(screen.getByText(/police/i)).toBeInTheDocument()
    expect(screen.getByText(/paramedic/i)).toBeInTheDocument()
    expect(screen.getByText(/firefighter/i)).toBeInTheDocument()
  })

  it("fast-track options render", () => {
    render(
      <AddWalkInModal isOpen onClose={onClose} onAddCustomer={onAddCustomer} />
    )
    expect(screen.getByText(/learner/i)).toBeInTheDocument()
    expect(screen.getByText(/pregnant/i)).toBeInTheDocument()
    expect(screen.getAllByText(/disability|elderly|infant/i).length).toBeGreaterThan(0)
  })

  it("data notice shows at bottom", () => {
    render(
      <AddWalkInModal isOpen onClose={onClose} onAddCustomer={onAddCustomer} />
    )
    expect(screen.getByText(/data notice|POPIA|personal information/i)).toBeInTheDocument()
  })

  it("returns null when closed", () => {
    const { container } = render(
      <AddWalkInModal
        isOpen={false}
        onClose={onClose}
        onAddCustomer={onAddCustomer}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("toggles off emergency radio when clicked again", async () => {
    const user = userEvent.setup()
    render(
      <AddWalkInModal isOpen onClose={onClose} onAddCustomer={onAddCustomer} />
    )
    const police = screen.getByText(/police/i)
    await user.click(police)
    await user.click(police)
    expect(screen.getByText(/no priority|standard/i)).toBeInTheDocument()
  })

  it("shows session walk-ins after successful add", async () => {
    const user = userEvent.setup()
    render(
      <AddWalkInModal isOpen onClose={onClose} onAddCustomer={onAddCustomer} />
    )
    await user.type(screen.getByPlaceholderText(/name/i), "Thabo")
    await user.click(screen.getByRole("button", { name: /add to queue/i }))
    expect(await screen.findByText(/1 added/i)).toBeInTheDocument()
    expect(screen.getAllByText("Thabo").length).toBeGreaterThanOrEqual(1)
    expect(onAddCustomer).toHaveBeenCalled()
  })
})
