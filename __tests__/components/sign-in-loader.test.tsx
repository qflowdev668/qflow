/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react"
import { SignInLoader, SIGN_IN_STATUS_FADE_MS, SIGN_IN_STATUS_HOLD_MS } from "@/components/qflow/sign-in-loader"

jest.mock("@/hooks/use-t", () => ({
  useT: () => ({
    signInCheckingDetails: "Checking your details",
    signInFindingPlace: "Finding your place",
    signInAlmostThere: "Almost there",
    signInYoureNext: "You're next",
    signInWelcomeName: "Welcome, {name}",
    signInTakingLonger: "Taking longer than usual",
    backToSignIn: "Back to sign in",
    retry: "Retry",
  }),
  fmt: (template: string, vars: Record<string, string>) => template.replaceAll("{name}", vars.name ?? ""),
}))

function mockReducedMotion(matches: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia
}

describe("SignInLoader", () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it("cycles the status lines once and holds the last one", async () => {
    jest.useFakeTimers()
    render(<SignInLoader />)

    const status = screen.getByTestId("sign-in-status")
    expect(status.textContent).toBe("Checking your details")
    expect(status.getAttribute("aria-live")).toBe("polite")
    expect(screen.getByTestId("sign-in-queue").getAttribute("aria-hidden")).toBe("true")

    await act(async () => {
      jest.advanceTimersByTime(SIGN_IN_STATUS_HOLD_MS)
    })
    expect(status.className).toContain("opacity-0")

    await act(async () => {
      jest.advanceTimersByTime(SIGN_IN_STATUS_FADE_MS)
    })
    expect(status.textContent).toBe("Finding your place")

    await act(async () => {
      jest.advanceTimersByTime(SIGN_IN_STATUS_HOLD_MS + SIGN_IN_STATUS_FADE_MS)
    })
    expect(status.textContent).toBe("Almost there")

    await act(async () => {
      jest.advanceTimersByTime(SIGN_IN_STATUS_HOLD_MS + SIGN_IN_STATUS_FADE_MS + 2000)
    })
    expect(status.textContent).toBe("Almost there")
  })

  it("shows the ticket on success and leaves the startup splash unmounted", () => {
    render(<SignInLoader phase="confirmed" firstName="Thandi" />)

    expect(screen.getByTestId("sign-in-ticket").textContent).toContain("You're next")
    expect(screen.getByTestId("sign-in-welcome").textContent).toBe("Welcome, Thandi")
    expect(screen.getByTestId("sign-in-tick")).toBeTruthy()
    expect(screen.queryByTestId("qflow-splash")).toBeNull()
    expect(screen.getByTestId("sign-in-status").textContent).toBe("Almost there")
  })

  it("shows the ticket without a name when none is cached", () => {
    render(<SignInLoader phase="confirmed" />)
    expect(screen.getByTestId("sign-in-ticket").textContent).toContain("You're next")
    expect(screen.queryByTestId("sign-in-welcome")).toBeNull()
  })

  it("switches to retry without shuffling", () => {
    render(<SignInLoader phase="slow" onRetry={jest.fn()} onBack={jest.fn()} />)

    expect(screen.getByTestId("sign-in-status").textContent).toBe("Taking longer than usual")
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Back to sign in" })).toBeTruthy()
    expect(screen.getByTestId("sign-in-queue").querySelector(".qflow-queue-shuffle")).toBeNull()
    expect(screen.queryByTestId("sign-in-ticket")).toBeNull()
  })

  it("drops motion classes when reduced motion is requested", async () => {
    mockReducedMotion(true)
    const reduced = render(<SignInLoader phase="confirmed" firstName="Ada" />)
    await act(async () => {})

    expect(document.querySelector(".qflow-sign-in-float")).toBeNull()
    expect(document.querySelector(".qflow-queue-shuffle")).toBeNull()
    expect(document.querySelector(".qflow-ticket-in")).toBeNull()
    expect(document.querySelector(".qflow-tick-spring")).toBeNull()
    expect(screen.getByTestId("sign-in-ticket")).toBeTruthy()
    reduced.unmount()

    mockReducedMotion(false)
    render(<SignInLoader phase="waiting" />)
    await act(async () => {})
    expect(document.querySelector(".qflow-queue-shuffle")).toBeTruthy()
    expect(document.querySelector(".qflow-sign-in-float")).toBeTruthy()
  })
})
