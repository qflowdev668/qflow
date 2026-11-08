/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AskQflowAssistant } from "@/components/qflow/ask-qflow-assistant"

jest.mock("@/hooks/use-t", () => ({
  useT: () => ({
    askQflowDisclosure:
      "Questions are processed by Meta Llama on Cloudflare and saved to help us improve QFlow.",
  }),
}))

const mockAssistantApp = { language: "en" }

jest.mock("@/lib/app-context", () => ({
  useApp: () => mockAssistantApp,
}))

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
    mockAssistantApp.language = "en"
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
    expect(screen.getByTestId("ask-qflow-disclosure")).toHaveTextContent(
      "Questions are processed by Meta Llama on Cloudflare and saved to help us improve QFlow."
    )
    expect(await screen.findByTestId("ask-qflow-model")).toHaveTextContent(LLAMA)
    expect(screen.getByRole("button", { name: "What documents do I need?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "How long is the wait?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Where do I go when I arrive?" })).toBeInTheDocument()
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

  it("labels a chip answer and sends the chip id", async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation((path: string) => {
      if (path === "/api/assistant/model") {
        return Promise.resolve(jsonResponse(200, { model: LLAMA }))
      }
      return Promise.resolve(
        jsonResponse(200, { reply: "Bring your green ID book.", model: LLAMA })
      )
    })

    render(<AskQflowAssistant locationId="loc-1" />)
    await user.click(screen.getByTestId("ask-qflow-toggle"))
    await user.click(screen.getByRole("button", { name: "What documents do I need?" }))

    const chipCall = apiFetch.mock.calls.find((call) => call[0] === "/api/assistant/chip")
    expect(chipCall).toBeTruthy()
    expect(JSON.parse((chipCall?.[1] as { body: string }).body)).toMatchObject({
      chip: "documents",
      language: "en",
      location_id: "loc-1",
    })
    expect(await screen.findByTestId("ask-qflow-ai-label")).toHaveTextContent("AI answer")
    expect(screen.getByTestId("ask-qflow-reply")).toHaveTextContent("Bring your green ID book.")
    expect(screen.getByTestId("powered-by-llama")).toHaveTextContent("Powered by Llama")
  })

  it("keeps the chips in a non-English UI and does not call Llama", async () => {
    const user = userEvent.setup()
    mockAssistantApp.language = "zu"
    render(<AskQflowAssistant />)
    await user.click(screen.getByTestId("ask-qflow-toggle"))

    expect(screen.getByTestId("ask-qflow-english-only")).toHaveTextContent(
      "AI answers are English-only for now"
    )
    expect(screen.getByRole("button", { name: "How long is the wait?" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "What documents do I need?" }))
    expect(apiFetch.mock.calls.some((call) => call[0] === "/api/assistant/chip")).toBe(false)
    expect(apiFetch.mock.calls.some((call) => call[0] === "/api/assistant/chat")).toBe(false)
  })

  it("shows a friendly chip fallback instead of a Workers AI trace", async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation((path: string) => {
      if (path === "/api/assistant/model") {
        return Promise.resolve(jsonResponse(200, { model: LLAMA }))
      }
      return Promise.resolve(
        jsonResponse(500, {
          error: "Traceback (most recent call last): TypeError: boom",
        })
      )
    })

    render(<AskQflowAssistant />)
    await user.click(screen.getByTestId("ask-qflow-toggle"))
    await user.click(screen.getByRole("button", { name: "How long is the wait?" }))

    expect(await screen.findByTestId("ask-qflow-reply")).toHaveTextContent(
      "Couldn't get an answer. Please try again."
    )
    expect(screen.getByTestId("ask-qflow-ai-label")).toHaveTextContent("AI answer")
    expect(screen.queryByText(/Traceback/)).not.toBeInTheDocument()
    expect(screen.queryByText(/TypeError/)).not.toBeInTheDocument()
  })
})
