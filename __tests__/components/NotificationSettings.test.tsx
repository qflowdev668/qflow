/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { NotificationSettingsScreen } from "@/components/qflow/screens/notification-settings-screen"

const setNotificationPreferences = jest.fn().mockResolvedValue(true)
const navigateTo = jest.fn()
const syncPushSubscription = jest.fn().mockResolvedValue("granted")
const unsubscribePush = jest.fn().mockResolvedValue(undefined)

jest.mock("@/hooks/use-t", () => ({
  useT: () =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          const labels: Record<string, string> = {
            notificationSettings: "Alert settings",
            pushNotifications: "Phone alerts",
            enabledOnDevice: "On for this device.",
            blockedInBrowser: "Blocked in this browser.",
            notifyMeWhen: "Tell me when:",
            fivePeopleAway: "5 people before my turn",
            twoPeopleAway: "2 people before my turn",
            itsMyTurn: "It is my turn.",
            queueMovingFaster: "Line is moving faster than expected",
            servicePaused: "Service is paused at my place.",
            smsPreview: "Alert preview",
            smsPreviewNote: "Example of a phone or in-app alert.",
            smsPreviewTurnSoon: "Hi {name}! Almost your turn.",
            smsPreviewWithQueue:
              "Hi {name}! You are #{position} in line at {location}. Wait: ~{wait} min.",
            savePreferences: "Save settings",
            preferencesSaved: "Preferences saved",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({
    navigateTo,
    currentUser: { id: "u1", name: "Bongani", email: "a@b.com", role: "user" },
    activeQueue: null,
    notificationPreferences: {
      notify5Away: true,
      notify2Away: true,
      notifyTurn: true,
      notifyFaster: false,
      notifyPaused: false,
    },
    setNotificationPreferences,
  }),
}))

jest.mock("@/hooks/use-chrome-insets", () => ({
  useChromeInsets: () => ({ paddingBottom: "0px" }),
}))

jest.mock("@/lib/web-push", () => ({
  syncPushSubscription: (...args: unknown[]) => syncPushSubscription(...args),
  unsubscribePush: (...args: unknown[]) => unsubscribePush(...args),
}))

jest.mock("@/components/qflow/top-bar", () => ({
  TopBar: ({ title }: { title: string }) => <header>{title}</header>,
}))

describe("NotificationSettingsScreen", () => {
  beforeEach(() => {
    setNotificationPreferences.mockClear()
    syncPushSubscription.mockClear()
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: jest.fn().mockResolvedValue("granted"),
      },
    })
  })

  it("saves checkbox state via setNotificationPreferences", async () => {
    render(<NotificationSettingsScreen />)
    // Toggle "my turn" off to prove local edits are included in the save payload.
    fireEvent.click(screen.getByTestId("pref-my-turn"))
    fireEvent.click(screen.getByTestId("save-notification-prefs"))

    await waitFor(() => {
      expect(setNotificationPreferences).toHaveBeenCalledWith({
        notify5Away: true,
        notify2Away: true,
        notifyTurn: false,
        notifyFaster: false,
        notifyPaused: false,
      })
    })
  })

  it("triggers push subscribe when Phone alerts is turned on", async () => {
    render(<NotificationSettingsScreen />)
    fireEvent.click(screen.getByTestId("phone-alerts-switch"))

    await waitFor(() => {
      expect(syncPushSubscription).toHaveBeenCalledWith({ requestPermission: true })
    })
  })
})
