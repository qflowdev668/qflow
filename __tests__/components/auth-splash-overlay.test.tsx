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
  session: null as { user: { id: string } } | null,
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
  }),
}))

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: auth.session } }),
      exchangeCodeForSession: (code: string) => auth.exchange(code),
    },
  }),
}))

jest.mock("@/lib/privileged-session-guard", () => ({
  fetchProfileRole: async () => "user",
  signOutIfPrivilegedGoogle: async () => false,
  privilegedGoogleBlockMessage: () => "blocked",
  privilegedGoogleLoginPath: () => "/login/staff",
}))

import { AuthSplashOverlay } from "@/components/qflow/auth-splash-overlay"

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

describe("AuthSplashOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetAuthCodeExchange()
    clearAuthSplash()
    nav.pathname = "/auth/callback/"
    nav.replace.mockClear()
    auth.session = null
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

  it("shows the branded splash and replaces into the app after one exchange", async () => {
    render(<AuthSplashOverlay />)

    expect(screen.getByTestId("qflow-splash")).toBeTruthy()
    expect(screen.getByTestId("qflow-splash-subtitle").textContent).toBe("Signing you in")
    expect(screen.queryByText("Signing you in...")).toBeNull()

    await flush()
    expect(auth.exchange).toHaveBeenCalledTimes(1)
    expect(nav.replace).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(400)
    })

    expect(nav.replace).toHaveBeenCalledWith("/home")
    const target = String(nav.replace.mock.calls[0][0])
    expect(target).not.toMatch(/OAuth|PKCE|error_description/)
  })

  it("continues into the app when an error param arrives with a session", async () => {
    auth.session = { user: { id: "user-1" } }
    setSearch("?error=server_error&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired")

    render(<AuthSplashOverlay />)
    await flush()
    await act(async () => {
      jest.advanceTimersByTime(400)
    })

    expect(auth.exchange).not.toHaveBeenCalled()
    expect(nav.replace).toHaveBeenCalledWith("/home")
    expect(String(nav.replace.mock.calls[0][0])).not.toMatch(/OAuth state/)
  })

  it("sends an expired link to login without the raw provider text", async () => {
    setSearch("?error=access_denied&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired")

    render(<AuthSplashOverlay />)
    await flush()
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
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Back to sign in" })).toBeTruthy()
    expect(nav.replace).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }))
    expect(nav.replace).toHaveBeenCalledWith("/login")
  })
})
