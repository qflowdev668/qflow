/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AskQflowAssistant } from "@/components/qflow/ask-qflow-assistant"

const apiFetch = jest.fn()

jest.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  formatApiErrorMessage: (payload: unknown, fallback = "Request failed.") => {
    if (payload && typeof payload === "object" && "error" in payload) {
      const error = (payload as { error?: unknown }).error
      if (typeof error === "string" && error.trim()) return error
    }
    return fallback
  },
}))

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

const LLAMA = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"

describe("AskQflowAssistant", () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockImplementation((path: string) => {
      if (path === "/api/assistant/model") {
        return Promise.resolve(jsonResponse(200, { model: LLAMA }))
      }
      return Promise.resolve(jsonResponse(500, { error: "Couldn't get an answer. Please try again." }))
    })
  })

  it("renders collapsed, then opens with starter questions and the Llama badge", async () => {
    const user = userEvent.setup()
    render(<AskQflowAssistant />)

    expect(screen.getByTestId("powered-by-llama")).toHaveTextContent("Powered by Llama")
    expect(screen.queryByTestId("ask-qflow-panel")).not.toBeInTheDocument()

    await user.click(screen.getByTestId("ask-qflow-toggle"))
    expect(screen.getByTestId("ask-qflow-panel")).toBeInTheDocument()
    expect(await screen.findByTestId("ask-qflow-model")).toHaveTextContent(LLAMA)
    expect(screen.getByRole("button", { name: "How long is my wait?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "What is Fast Track?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "How do I get directions?" })).toBeInTheDocument()
  })

  it("uses an icon and label in compact sheets", async () => {
    const user = userEvent.setup()
    render(<AskQflowAssistant compact />)

    const toggle = screen.getByTestId("ask-qflow-toggle")
    expect(toggle).toHaveTextContent("Ask QFlow")
    expect(toggle).not.toHaveTextContent("Questions about your line")
    expect(screen.queryByTestId("powered-by-llama")).not.toBeInTheDocument()

    await user.click(toggle)
    expect(await screen.findByTestId("ask-qflow-model")).toHaveTextContent(LLAMA)
  })

  it("sends a message, shows loading, then shows the Llama reply", async () => {
    const user = userEvent.setup()
    let resolveFetch: (value: unknown) => void = () => {}
    apiFetch.mockImplementation((path: string) => {
      if (path === "/api/assistant/model") {
        return Promise.resolve(jsonResponse(200, { model: LLAMA }))
      }
      return new Promise((resolve) => {
        resolveFetch = resolve
      })
    })

    render(<AskQflowAssistant />)
    await user.click(screen.getByTestId("ask-qflow-toggle"))
    await user.type(screen.getByTestId("ask-qflow-input"), "What is Fast Track?")
    await user.click(screen.getByTestId("ask-qflow-send"))

    expect(screen.getByTestId("ask-qflow-user")).toHaveTextContent("What is Fast Track?")
    expect(screen.getByTestId("ask-qflow-loading")).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/assistant/chat",
      expect.objectContaining({ method: "POST" })
    )

    resolveFetch(
      jsonResponse(200, {
        reply: "Fast Track is a shorter line for people who qualify.",
        model: LLAMA,
      })
    )

    await waitFor(() => {
      expect(screen.getByTestId("ask-qflow-reply")).toHaveTextContent(
        "Fast Track is a shorter line for people who qualify."
      )
    })
    expect(screen.queryByTestId("ask-qflow-loading")).not.toBeInTheDocument()
  })

  it("shows a safe error and hides raw traces", async () => {
    const user = userEvent.setup()
    apiFetch.mockResolvedValue(
      jsonResponse(500, {
        error: "Couldn't get an answer. Please try again.",
        stack: "Traceback (most recent call last):\nTypeError: boom",
      })
    )

    render(<AskQflowAssistant />)
    await user.click(screen.getByTestId("ask-qflow-toggle"))
    await user.type(screen.getByTestId("ask-qflow-input"), "Hello")
    await user.click(screen.getByTestId("ask-qflow-send"))

    expect(await screen.findByTestId("ask-qflow-error")).toHaveTextContent(
      "Couldn't get an answer. Please try again."
    )
    expect(screen.queryByText(/Traceback/)).not.toBeInTheDocument()
    expect(screen.queryByText(/TypeError/)).not.toBeInTheDocument()
  })
})
