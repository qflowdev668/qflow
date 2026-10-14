/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react"
import { resetAuthGateForTests } from "@/lib/auth-gate"
import { resetOAuthResolution } from "@/lib/auth-resolution"
import { clearAuthSplash } from "@/lib/auth-splash"

const nav = {
  pathname: "/login/",
  replace: jest.fn(),
}

const app = {
  isAuthLoading: false,
  currentUser: null as { id: string; role: string } | null,
}

const session = {
  current: null as { user: { id: string } } | null,
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
  useT: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => (prop === "signingYouIn" ? "Signing you in" : String(prop)),
      }
    ),
  fmt: (template: string) => template,
}))

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({ isAuthLoading: app.isAuthLoading, currentUser: app.currentUser }),
}))

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: session.current } }),
    },
  }),
}))

import { PublicOnlyGate } from "@/components/qflow/public-only-gate"

function LoginForm() {
  return <form data-testid="login-form">Welcome back</form>
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("PublicOnlyGate", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetAuthGateForTests()
    resetOAuthResolution()
    clearAuthSplash()
    nav.replace.mockClear()
    nav.pathname = "/login/"
    app.isAuthLoading = false
    app.currentUser = null
    session.current = null
    window.history.pushState({}, "", "/login/")
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("shows the login form only after a signed-out session check", async () => {
    app.isAuthLoading = true
    const view = render(
      <PublicOnlyGate>
        <LoginForm />
      </PublicOnlyGate>
    )
    expect(screen.queryByTestId("login-form")).toBeNull()
    expect(screen.getByTestId("home-greeting-skeleton")).toBeTruthy()

    app.isAuthLoading = false
    view.rerender(
      <PublicOnlyGate>
        <LoginForm />
      </PublicOnlyGate>
    )
    await flush()

    expect(screen.getByTestId("login-form")).toBeTruthy()
    expect(screen.getByText("Welcome back")).toBeTruthy()
    expect(nav.replace).not.toHaveBeenCalled()
  })

  it("does not paint the form when a session is already stored", async () => {
    app.currentUser = { id: "user-1", role: "user" }
    session.current = { user: { id: "user-1" } }

    render(
      <PublicOnlyGate>
        <LoginForm />
      </PublicOnlyGate>
    )

    expect(screen.queryByTestId("login-form")).toBeNull()
    expect(screen.queryByText("Welcome back")).toBeNull()
    expect(nav.replace).toHaveBeenCalledWith("/home")
  })
})
