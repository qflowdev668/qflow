/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react"
import { resetAuthGateForTests } from "@/lib/auth-gate"
import { beginOAuthResolution, resetOAuthResolution } from "@/lib/auth-resolution"
import { clearAuthSplash, markAuthSplash } from "@/lib/auth-splash"

const nav = {
  pathname: "/profile/",
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
        get: (_target, prop) => String(prop),
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

import { AuthGate } from "@/components/qflow/auth-gate"

const PROTECTED = ["/home/", "/profile/", "/queue/", "/map/", "/notifications/", "/rate/", "/staff/", "/admin/"]

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("AuthGate", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetAuthGateForTests()
    resetOAuthResolution()
    clearAuthSplash()
    nav.replace.mockClear()
    nav.pathname = "/profile/"
    app.isAuthLoading = false
    app.currentUser = null
    session.current = null
    window.history.pushState({}, "", "/profile/")
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it.each(PROTECTED)("does not navigate %s to login while an OAuth session is stored", async (pathname) => {
    nav.pathname = pathname
    window.history.pushState({}, "", pathname)
    app.isAuthLoading = true
    session.current = { user: { id: "user-1" } }
    markAuthSplash()
    beginOAuthResolution()

    const view = render(
      <AuthGate>
        <div data-testid="page">ready</div>
      </AuthGate>
    )

    expect(nav.replace).not.toHaveBeenCalled()
    if (pathname === "/home/") {
      expect(screen.getByTestId("home-greeting-skeleton")).toBeTruthy()
    } else {
      expect(screen.getByTestId("post-sign-in-neutral")).toBeTruthy()
    }
    expect(screen.queryByTestId("page")).toBeNull()

    await flush()
    expect(nav.replace.mock.calls.every((call) => !String(call[0]).startsWith("/login"))).toBe(true)

    app.isAuthLoading = false
    app.currentUser = { id: "user-1", role: "user" }
    view.rerender(
      <AuthGate>
        <div data-testid="page">ready</div>
      </AuthGate>
    )
    await flush()

    expect(screen.getByTestId("page")).toBeTruthy()
    expect(nav.replace.mock.calls.every((call) => !String(call[0]).startsWith("/login"))).toBe(true)
  })

  it.each(PROTECTED)("redirects a signed-out visit to %s", async (pathname) => {
    nav.pathname = pathname
    window.history.pushState({}, "", pathname)
    session.current = null

    render(
      <AuthGate>
        <div data-testid="page">ready</div>
      </AuthGate>
    )
    expect(nav.replace).not.toHaveBeenCalled()
    await flush()

    expect(nav.replace).toHaveBeenCalledWith(`/login?returnUrl=${encodeURIComponent(pathname)}`)
  })
})
