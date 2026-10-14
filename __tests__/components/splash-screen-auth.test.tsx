/**
 * @jest-environment jsdom
 */
import { act, render } from "@testing-library/react"
import { clearAuthSplash, markAuthSplash } from "@/lib/auth-splash"

const app = {
  isAuthLoading: false,
  isAuthenticated: false,
  currentUser: null as { id: string; role: string } | null,
  hasCompletedOnboarding: true,
  navigateTo: jest.fn(),
}

jest.mock("@/lib/app-context", () => ({
  useApp: () => app,
}))

jest.mock("@/hooks/use-t", () => ({
  useT: () => ({ splashTagline: "Skip the queue", cookieTitle: "", cookieDesc: "", cookieAccept: "", cookieContinue: "" }),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

import { SplashScreen } from "@/components/qflow/screens/splash-screen"

describe("SplashScreen during sign-in", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    clearAuthSplash()
    app.isAuthLoading = false
    app.isAuthenticated = false
    app.currentUser = null
    app.hasCompletedOnboarding = true
    app.navigateTo.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    clearAuthSplash()
  })

  it("does not open login while the sign-in cover is up and the user is still unknown", () => {
    markAuthSplash()
    render(<SplashScreen />)
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(app.navigateTo).not.toHaveBeenCalled()
  })

  it("opens login after the startup splash once auth has resolved signed out", () => {
    window.localStorage.setItem("qflow_cookie_accepted", "true")
    render(<SplashScreen />)
    act(() => {
      jest.advanceTimersByTime(2500)
    })
    expect(app.navigateTo).toHaveBeenCalledWith("login")
  })
})
