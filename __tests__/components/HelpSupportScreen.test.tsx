import { render, screen } from "@testing-library/react"
import { createAppMock, mockUseT } from "../helpers/mock-app"
import { HelpSupportScreen } from "@/components/qflow/screens/help-support-screen"

const appState = createAppMock()

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () => appState,
}))

describe("HelpSupportScreen", () => {
  beforeEach(() => {
    Object.assign(appState, createAppMock())
  })

  it("shows FAQ questions and answers without expanding", () => {
    render(<HelpSupportScreen />)
    expect(screen.getByText("How do I join a queue?")).toBeInTheDocument()
    expect(
      screen.getByText(/Open Home or Map, choose a location, then tap Join/i)
    ).toBeInTheDocument()
    expect(screen.getByText("support@qflow.co.za")).toBeInTheDocument()
  })
})
