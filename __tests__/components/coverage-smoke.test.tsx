import { render, screen } from "@testing-library/react"
import { createAppMock, mockUseT, sampleLocation } from "../helpers/mock-app"
import { Users } from "lucide-react"

jest.mock("@/hooks/use-t", () => mockUseT())

const appState = createAppMock({
  isAuthLoading: false,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
})
jest.mock("@/lib/app-context", () => {
  const actual = jest.requireActual("@/lib/app-context")
  return {
    ...actual,
    useApp: () => appState,
  }
})

import { StatsCard } from "@/components/qflow/stats-card"
import { QueueStatusBadge } from "@/components/qflow/queue-status-badge"
import { OfflineBanner } from "@/components/qflow/offline-banner"
import { PasswordRules } from "@/components/qflow/password-rules"
import { LocationCard } from "@/components/qflow/location-card"
import { SplashScreen } from "@/components/qflow/screens/splash-screen"
import { OnboardingScreen } from "@/components/qflow/screens/onboarding-screen"
import { PublicStatusPage } from "@/components/qflow/screens/public-status-page"
import { LoginScreen } from "@/components/qflow/screens/login-screen"

describe("Coverage smoke — shared UI", () => {
  it("StatsCard variants", () => {
    const { rerender } = render(
      <StatsCard label="Waiting" value={3} icon={Users} />
    )
    expect(screen.getByText("Waiting")).toBeInTheDocument()
    rerender(<StatsCard label="Served" value={8} variant="success" />)
    rerender(<StatsCard label="Priority" value={1} variant="warning" />)
    rerender(<StatsCard label="Primary" value={2} variant="primary" />)
  })

  it("QueueStatusBadge all statuses", () => {
    for (const status of ["waiting", "almost", "your-turn", "serving", "served"] as const) {
      const { unmount } = render(<QueueStatusBadge status={status} />)
      unmount()
    }
  })

  it("PasswordRules", () => {
    render(
      <PasswordRules
        password="Abcdefghijk1!"
        labels={{
          passwordRuleLength: "12+",
          passwordRuleLower: "lower",
          passwordRuleUpper: "upper",
          passwordRuleNumber: "num",
          passwordRuleSymbol: "sym",
        }}
      />
    )
    expect(screen.getByText("12+")).toBeInTheDocument()
  })

  it("LocationCard", () => {
    render(<LocationCard location={sampleLocation} onClick={jest.fn()} />)
    expect(screen.getByText("Hillbrow Clinic")).toBeInTheDocument()
  })

  it("OfflineBanner online", () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    })
    render(<OfflineBanner />)
  })
})

describe("Coverage smoke — public screens", () => {
  beforeEach(() => {
    Object.assign(
      appState,
      createAppMock({
        navigateTo: jest.fn(),
        isAuthLoading: false,
        isAuthenticated: false,
        hasCompletedOnboarding: false,
      })
    )
  })

  it("SplashScreen", () => {
    render(<SplashScreen />)
    expect(screen.getAllByText(/QFlow/i).length).toBeGreaterThan(0)
  })

  it("OnboardingScreen", () => {
    // First step may be language — ensure i18n module is available
    const { languageOptions } = require("@/lib/i18n")
    expect(languageOptions.length).toBeGreaterThan(0)
    render(<OnboardingScreen />)
    expect(screen.getAllByText(/find|location|next|skip|language|english/i).length).toBeGreaterThan(0)
  })

  it("LoginScreen", () => {
    render(<LoginScreen />)
    expect(screen.getAllByText(/login|email|sign/i).length).toBeGreaterThan(0)
  })

  it("PublicStatusPage", () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        overall: "operational",
        overallLabel: "All systems operational",
        components: [{ name: "App", status: "operational" }],
        checkedAt: new Date().toISOString(),
      }),
    }) as jest.Mock
    render(<PublicStatusPage />)
  })
})
