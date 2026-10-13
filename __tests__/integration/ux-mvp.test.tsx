/**
 * MVP journeys for the customer UX rules:
 * skeleton while home loads, onboarding action stays in the footer,
 * leave-line acknowledges the tap, delete-account cancel is a real button,
 * and backend internals never reach the screen.
 *
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { getTranslations } from "@/lib/i18n"
import { sampleLocation } from "../helpers/mock-app"
import type { QueueEntry } from "@/lib/app-context"

const t = getTranslations("en")

const app = {
  currentUser: { id: "u1", name: "Bongani", email: "b@example.com", role: "user" as const },
  locations: [] as typeof sampleLocation[],
  locationsReady: false,
  notifications: [],
  navigateTo: jest.fn(),
  setSelectedLocation: jest.fn(),
  refreshLocations: jest.fn(),
  activeQueue: null as QueueEntry | null,
  leaveQueue: jest.fn(),
  logout: jest.fn(),
  queueHistory: [],
  language: "en" as const,
  exportMyData: jest.fn(),
  clearQueueHistory: jest.fn(),
  accessibility: { textSize: "normal", simplifiedMode: false },
  lastSyncedAt: null,
  completeOnboarding: jest.fn(),
  setLanguage: jest.fn(),
}

jest.mock("@/hooks/use-t", () => ({
  useT: () => getTranslations("en"),
}))

jest.mock("@/lib/app-context", () => ({
  useApp: () => app,
  languageOptions: [
    { code: "en", english: "English", native: "English", flag: "🇬🇧" },
  ],
}))

jest.mock("@/components/qflow/server-outage-banner", () => ({
  useServerOutage: () => ({ isServerDown: false }),
}))

jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
}))

jest.mock("@/components/qflow/bottom-nav", () => ({
  BottomNav: () => <nav />,
}))

jest.mock("@/components/qflow/session-expiry-banner", () => ({
  useSession: () => ({ sessionExpiresAt: null, refreshSession: jest.fn() }),
}))

jest.mock("framer-motion", () => ({
  useReducedMotion: () => false,
}))

import { HomeScreen } from "@/components/qflow/screens/home-screen"
import { MyQueueScreen } from "@/components/qflow/screens/my-queue-screen"
import { ProfileScreen } from "@/components/qflow/screens/profile-screen"
import { OnboardingScreen } from "@/components/qflow/screens/onboarding-screen"
import { formatApiErrorMessage } from "@/lib/api-client"

describe("MVP customer journeys", () => {
  beforeEach(() => {
    app.locations = []
    app.locationsReady = false
    app.leaveQueue.mockClear()
    app.completeOnboarding.mockClear()
  })

  it("shows location skeletons, then the real list", () => {
    const { rerender } = render(<HomeScreen />)
    expect(screen.getByTestId("home-location-skeletons")).toBeTruthy()
    expect(screen.queryByText(sampleLocation.name)).toBeNull()

    app.locations = [sampleLocation]
    app.locationsReady = true
    rerender(<HomeScreen />)

    expect(screen.queryByTestId("home-location-skeletons")).toBeNull()
    expect(screen.getAllByText(sampleLocation.name).length).toBeGreaterThan(0)
  })

  it("keeps Next inside the same footer on every onboarding step", () => {
    render(<OnboardingScreen />)
    const footer = () => screen.getByTestId("user-screen-layout-footer")
    const next = () => screen.getByRole("button", { name: /next/i })

    expect(footer()).toContainElement(next())
    fireEvent.click(next())
    expect(footer()).toContainElement(screen.getByRole("button", { name: /next/i }))
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    expect(footer()).toContainElement(screen.getByRole("button", { name: /start/i }))
  })

  it("acknowledges Leave the line before the request finishes", () => {
    app.activeQueue = {
      id: "qe-1",
      locationId: sampleLocation.id,
      locationName: sampleLocation.name,
      locationAddress: sampleLocation.address,
      position: 3,
      totalInQueue: 8,
      estimatedWait: 12,
      status: "waiting",
      joinedAt: new Date(),
    }
    render(<MyQueueScreen />)
    fireEvent.click(screen.getByRole("button", { name: t.leaveQueue }))
    expect(screen.getByRole("button", { name: t.saving })).toBeDisabled()
    expect(app.leaveQueue).toHaveBeenCalledTimes(1)
  })

  it("lets the user back out of delete-account in one tap", () => {
    render(<ProfileScreen />)
    fireEvent.click(screen.getByText(t.deleteMyAccount))
    expect(screen.getByRole("heading", { name: t.deleteYourAccount })).toBeTruthy()
    const cancel = screen.getByRole("button", { name: t.cancel })
    const destroy = screen.getByRole("button", { name: t.permanentlyDeleteAccount })
    expect(cancel).toBeEnabled()
    expect(destroy).toBeDisabled()
    fireEvent.click(cancel)
    expect(screen.queryByRole("heading", { name: t.deleteYourAccount })).toBeNull()
  })

  it("never shows a stack trace when a request fails", async () => {
    const message = formatApiErrorMessage(
      {
        detail:
          "TypeError: Cannot read properties of undefined (reading 'id')\n    at getFeed (/api/v2/feed.js:48:17)",
      },
      "We couldn't load this. Check your connection and try again."
    )
    expect(message).toBe("We couldn't load this. Check your connection and try again.")
    expect(message).not.toMatch(/TypeError|getFeed|feed\.js/)

    await waitFor(() => {
      expect(message.length).toBeLessThan(120)
    })
  })
})
