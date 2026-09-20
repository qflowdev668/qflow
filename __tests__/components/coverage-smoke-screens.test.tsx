import { render } from "@testing-library/react"
import { createAppMock, mockUseT, sampleLocation, servingCustomer } from "../helpers/mock-app"

jest.mock("@/hooks/use-t", () => mockUseT())

const appState = createAppMock({
  isAuthLoading: false,
  currentlyServing: servingCustomer("standard"),
  locations: [sampleLocation, { ...sampleLocation, id: "loc-2", name: "Bank Branch", type: "bank" }],
})

jest.mock("@/lib/app-context", () => {
  const actual = jest.requireActual("@/lib/app-context")
  return { ...actual, useApp: () => appState }
})
jest.mock("@/lib/supabase/client", () => ({ createClient: () => null }))
jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
  OfflineBanner: () => null,
}))
jest.mock("@/components/qflow/server-outage-banner", () => ({
  useServerOutage: () => ({ isServerDown: false }),
}))
jest.mock("@/components/qflow/top-bar", () => ({
  TopBar: ({ title }: { title?: string }) => <div>{title}</div>,
}))
jest.mock("@/components/qflow/add-walk-in-modal", () => ({
  AddWalkInModal: () => null,
}))

import { HomeScreen } from "@/components/qflow/screens/home-screen"
import { MapScreen } from "@/components/qflow/screens/map-screen"
import { HelpSupportScreen } from "@/components/qflow/screens/help-support-screen"
import { NotificationsScreen } from "@/components/qflow/screens/notifications-screen"
import { RegisterScreen } from "@/components/qflow/screens/register-screen"
import { ForgotPasswordScreen } from "@/components/qflow/screens/forgot-password-screen"
import { StaffLoginScreen } from "@/components/qflow/screens/staff-login-screen"
import { LanguageSelectionScreen } from "@/components/qflow/screens/language-selection-screen"
import { NotificationSettingsScreen } from "@/components/qflow/screens/notification-settings-screen"
import { AuditLogScreen } from "@/components/qflow/screens/audit-log-screen"
import { ManageStaffScreen } from "@/components/qflow/screens/manage-staff-screen"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { ErrorBoundary } from "@/components/qflow/error-boundary"
import { KioskLanguageBar } from "@/components/qflow/kiosk-language-bar"

describe("Coverage smoke — authenticated & staff screens", () => {
  beforeEach(() => {
    Object.assign(
      appState,
      createAppMock({
        currentlyServing: servingCustomer("standard"),
        locations: [
          sampleLocation,
          { ...sampleLocation, id: "loc-2", name: "Bank Branch", type: "bank" },
        ],
        navigateTo: jest.fn(),
        logout: jest.fn(),
        setLanguage: jest.fn(),
        completeOnboarding: jest.fn(),
      })
    )
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as jest.Mock
  })

  const screens: Array<[string, () => React.ReactElement]> = [
    ["HomeScreen", () => <HomeScreen />],
    ["MapScreen", () => <MapScreen />],
    ["HelpSupportScreen", () => <HelpSupportScreen />],
    ["NotificationsScreen", () => <NotificationsScreen />],
    ["RegisterScreen", () => <RegisterScreen />],
    ["ForgotPasswordScreen", () => <ForgotPasswordScreen />],
    ["StaffLoginScreen", () => <StaffLoginScreen />],
    ["LanguageSelectionScreen", () => <LanguageSelectionScreen />],
    ["NotificationSettingsScreen", () => <NotificationSettingsScreen />],
    ["AuditLogScreen", () => <AuditLogScreen />],
    ["ManageStaffScreen", () => <ManageStaffScreen />],
    ["BottomNav", () => <BottomNav />],
    [
      "KioskLanguageBar",
      () => (
        <KioskLanguageBar selectedLanguage="en" onLanguageChange={() => undefined} />
      ),
    ],
    [
      "ErrorBoundary",
      () => (
        <ErrorBoundary>
          <div>ok</div>
        </ErrorBoundary>
      ),
    ],
  ]

  it.each(screens)("renders %s without crashing", (_name, ui) => {
    const { unmount } = render(ui())
    unmount()
  })
})
