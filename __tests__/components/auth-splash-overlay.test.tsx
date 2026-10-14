/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react"
import { resetAuthCodeExchange } from "@/lib/auth-code"
import { clearAuthSplash } from "@/lib/auth-splash"

const nav = {
  pathname: "/auth/callback/",
  replace: jest.fn(),
}

const auth = {
  session: null as { user: { id: string; user_metadata?: Record<string, unknown> } } | null,
  hangSession: false,
  hangProfile: false,
  role: "user" as "user" | "staff" | "admin",
  exchange: jest.fn(async () => ({ error: null as { message: string } | null })),
}

jest.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({
    replace: nav.replace,
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock("@/hooks/use-t", () => ({
  useT: () => ({
    signingYouIn: "Signing you in",
    signInLinkExpired: "That sign-in link expired. Please try again.",
    signInTakingLonger: "Taking longer than usual",
    backToSignIn: "Back to sign in",
    retry: "Retry",
    categoryAll: "All",
    categoryClinic: "Clinic",
    categoryBank: "Bank",
    categoryGovernment: "Government",
    categoryOther: "Other",
    findLocationDesc: "Look for clinics.",
    navMyQueue: "My line",
    noActiveQueueHint: "Find a place.",
    navMap: "Map",
    allLocations: "All locations",
    shortestQueues: "Shortest queues",
  }),
  fmt: (template: string, vars: Record<string, string>) =>
    template.replaceAll("{name}", vars.name ?? ""),
}))

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        auth.hangSession
          ? new Promise(() => undefined)
          : Promise.resolve({ data: { session: auth.session } }),
      exchangeCodeForSession: () => auth.exchange(),
    },
  }),
}))

jest.mock("@/lib/privileged-session-guard", () => ({
  fetchProfileRole: () => (auth.hangProfile ? new Promise(() => undefined) : Promise.resolve(auth.role)),
  signOutIfPrivilegedGoogle: async () => false,
  privilegedGoogleBlockMessage: () => "blocked",
  privilegedGoogleLoginPath: () => "/login/staff",
}))

import { AuthSplashOverlay } from "@/components/qflow/auth-splash-overlay"
import AuthCallbackPage from "@/app/auth/callback/page"

function setSearch(search: string) {
  window.history.pushState({}, "", `/auth/callback/${search}`)
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("Auth callback page", () => {
  it("does not mount a second splash", () => {
    const { container } = render(<AuthCallbackPage />)
    expect(container.querySelector("[data-testid=qflow-splash]")).toBeNull()
    expect(container.querySelector("[data-testid=sign-in-loader]")).toBeNull()
    expect(container.querySelector("[data-testid=post-sign-in-skeleton]")).toBeNull()
  })
})

describe("AuthSplashOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetAuthCodeExchange()
    clearAuthSplash()
    nav.pathname = "/auth/callback/"
    nav.replace.mockClear()
    auth.session = null
    auth.hangSession = false
    auth.hangProfile = false
    auth.role = "user"
    window.sessionStorage.removeItem("qflow_last_route")
    auth.exchange.mockReset()
    auth.exchange.mockImplementation(async () => {
      auth.session = { user: { id: "user-1" } }
      return { error: null }
    })
    setSearch("?code=abc")
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("shows home skeletons and replaces into the app after one exchange", async () => {
    render(<AuthSplashOverlay />)

    expect(screen.getByTestId("post-sign-in-skeleton")).toBeTruthy()
    expect(screen.getByTestId("home-greeting-skeleton")).toBeTruthy()
    expect(screen.getByTestId("home-search-skeleton")).toBeTruthy()
    expect(screen.getByTestId("home-location-skeletons")).toBeTruthy()
    expect(screen.queryByTestId("post-sign-in-neutral")).toBeNull()
    expect(screen.queryByTestId("sign-in-loader")).toBeNull()
    expect(screen.queryByTestId("qflow-splash")).toBeNull()
    expect(screen.getByRole("status", { name: "Signing you in" })).toBeTruthy()
    expect(screen.getByTestId("home-greeting-skeleton").firstElementChild?.className).toContain(
      "motion-reduce:animate-none"
    )

    await flush()
    expect(auth.exchange).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId("sign-in-ticket")).toBeNull()
    expect(nav.replace).toHaveBeenCalledWith("/home")
    const target = String(nav.replace.mock.calls[0][0])
    expect(target).not.toMatch(/OAuth|PKCE|error_description/)
  })

  it("drops the skeleton as soon as the destination replaces", async () => {
    const view = render(<AuthSplashOverlay />)
    await flush()
    expect(screen.getByTestId("post-sign-in-skeleton")).toBeTruthy()
    expect(nav.replace).toHaveBeenCalledWith("/home")

    nav.pathname = "/home/"
    view.rerender(<AuthSplashOverlay />)
    expect(screen.queryByTestId("post-sign-in-skeleton")).toBeNull()
    expect(screen.queryByTestId("sign-in-loader")).toBeNull()
    expect(screen.queryByTestId("qflow-splash")).toBeNull()
  })

  it("continues into the app when an error param arrives with a session", async () => {
    auth.session = { user: { id: "user-1", user_metadata: { name: "Thandi Mkhize" } } }
    setSearch("?error=server_error&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired")

    render(<AuthSplashOverlay />)
    await flush()
    await act(async () => {
      jest.advanceTimersByTime(400)
    })

    expect(auth.exchange).not.toHaveBeenCalled()
    expect(screen.queryByTestId("sign-in-loader")).toBeNull()
    expect(nav.replace).toHaveBeenCalledWith("/home")
    expect(String(nav.replace.mock.calls[0][0])).not.toMatch(/OAuth state/)
  })

  it("sends an expired link to login without the raw provider text", async () => {
    setSearch("?error=access_denied&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired")

    render(<AuthSplashOverlay />)
    expect(screen.queryByTestId("home-greeting-skeleton")).toBeNull()
    expect(screen.getByTestId("post-sign-in-neutral")).toBeTruthy()
    await flush()
    expect(screen.queryByTestId("sign-in-ticket")).toBeNull()
    await act(async () => {
      jest.advanceTimersByTime(400)
    })

    expect(auth.exchange).not.toHaveBeenCalled()
    const target = String(nav.replace.mock.calls[0][0])
    expect(target.startsWith("/login?auth_error=")).toBe(true)
    expect(decodeURIComponent(target)).toContain("That sign-in link expired. Please try again.")
    expect(target).not.toMatch(/OAuth|bad_oauth_state/)
  })

  it("shows a retry after the splash waits too long", async () => {
    auth.exchange.mockImplementation(() => new Promise(() => undefined))

    render(<AuthSplashOverlay />)
    await act(async () => {
      jest.advanceTimersByTime(8000)
    })

    expect(screen.getByText("Taking longer than usual")).toBeTruthy()
    expect(screen.getByTestId("post-sign-in-skeleton")).toBeTruthy()
    expect(screen.queryByTestId("sign-in-loader")).toBeNull()
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Back to sign in" })).toBeTruthy()
    expect(nav.replace).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }))
    expect(nav.replace).toHaveBeenCalledWith("/login")
  })

  it("leaves for login when an error link's session check never returns", async () => {
    auth.hangSession = true
    setSearch("?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired")

    render(<AuthSplashOverlay />)
    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
      await Promise.resolve()
    })

    const target = String(nav.replace.mock.calls.at(-1)?.[0] ?? "")
    expect(target.startsWith("/login?auth_error=")).toBe(true)
    expect(decodeURIComponent(target)).toContain("That sign-in link expired. Please try again.")
    expect(target).not.toMatch(/OAuth|bad_oauth_state|error_description/)
  })

  it("enters the app when a session exists even if the profile request hangs", async () => {
    auth.session = { user: { id: "user-1" } }
    auth.hangProfile = true
    setSearch("?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired")

    render(<AuthSplashOverlay />)
    await flush()
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      jest.advanceTimersByTime(350)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(nav.replace).toHaveBeenCalledWith("/home")
    expect(String(nav.replace.mock.calls[0][0])).not.toMatch(/error_description|OAuth/)
  })

  it("uses a neutral skeleton for a restored route and keeps the short hold", async () => {
    window.sessionStorage.setItem("qflow_last_route", "/map")

    render(<AuthSplashOverlay />)
    expect(screen.queryByTestId("home-greeting-skeleton")).toBeNull()
    expect(screen.getByTestId("post-sign-in-neutral")).toBeTruthy()
    expect(screen.getByRole("status", { name: "Signing you in" })).toBeTruthy()

    await flush()
    expect(nav.replace).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(nav.replace).toHaveBeenCalledWith("/map")
  })

  it("uses a neutral skeleton for a join link", async () => {
    window.sessionStorage.setItem("qflow_last_route", "/location/abc")

    render(<AuthSplashOverlay />)
    expect(screen.queryByTestId("home-greeting-skeleton")).toBeNull()
    expect(screen.getByTestId("post-sign-in-neutral")).toBeTruthy()

    await flush()
    expect(nav.replace).not.toHaveBeenCalled()
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(nav.replace).toHaveBeenCalledWith("/location/abc")
  })

  it("uses a neutral skeleton for the staff home", async () => {
    auth.role = "staff"
    render(<AuthSplashOverlay />)
    await flush()
    expect(screen.queryByTestId("home-greeting-skeleton")).toBeNull()
    expect(screen.getByTestId("post-sign-in-neutral")).toBeTruthy()
    expect(nav.replace).not.toHaveBeenCalled()
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(nav.replace).toHaveBeenCalledWith("/staff")
  })

  it("uses a neutral skeleton for the admin home", async () => {
    auth.role = "admin"
    render(<AuthSplashOverlay />)
    await flush()
    expect(screen.queryByTestId("home-greeting-skeleton")).toBeNull()
    expect(screen.getByTestId("post-sign-in-neutral")).toBeTruthy()
    expect(nav.replace).not.toHaveBeenCalled()
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(nav.replace).toHaveBeenCalledWith("/admin")
  })
})
