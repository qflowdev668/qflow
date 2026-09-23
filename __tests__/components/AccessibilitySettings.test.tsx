/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AccessibilitySettingsScreen } from "@/components/qflow/screens/accessibility-settings-screen"
import {
  loadAccessibilitySettings,
  saveAccessibilitySettings,
  ACCESSIBILITY_STORAGE_KEY,
} from "@/lib/accessibility-prefs"

const setAccessibility = jest.fn()
const navigateTo = jest.fn()

jest.mock("@/hooks/use-t", () => ({
  useT: () =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          const labels: Record<string, string> = {
            accessibility: "Accessibility",
            textSize: "Text size",
            sizeSmall: "Small",
            sizeNormal: "Normal",
            sizeLarge: "Large",
            sizeXLarge: "Extra large",
            sizeExtraLarge: "Extra large",
            previewPositionExample: "Your place is #5",
            highContrastMode: "High contrast",
            highContrastDesc: "Black background and white text",
            simplifiedMode: "Simple mode",
            simplifiedModeDesc: "Shows only the most important info",
            buttonSize: "Button size",
            joinQueue: "Join the line",
            yourNumber: "Your number",
            waitLabel: "Wait",
            minutes: "min",
            saveAccessibilitySettings: "Save accessibility settings",
            settingsSaved: "Settings saved",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({
    accessibility: {
      textSize: "normal",
      highContrast: false,
      simplifiedMode: false,
      buttonSize: "normal",
    },
    setAccessibility,
    navigateTo,
  }),
}))

jest.mock("@/hooks/use-chrome-insets", () => ({
  useChromeInsets: () => ({
    paddingBottom: "0px",
    fixedFooterBottom: "0px",
  }),
}))

jest.mock("@/components/qflow/top-bar", () => ({
  TopBar: ({ title }: { title: string }) => <header>{title}</header>,
}))

describe("AccessibilitySettingsScreen", () => {
  beforeEach(() => {
    setAccessibility.mockClear()
    window.localStorage.clear()
  })

  it("updates high contrast and simple mode previews", () => {
    render(<AccessibilitySettingsScreen />)

    fireEvent.click(screen.getByTestId("high-contrast-toggle"))
    expect(screen.getByTestId("high-contrast-preview").className).toMatch(/bg-black/)

    fireEvent.click(screen.getByTestId("simple-mode-toggle"))
    expect(screen.getByTestId("simple-mode-preview")).toHaveTextContent("#5")
  })

  it("persists settings via setAccessibility on save", async () => {
    render(<AccessibilitySettingsScreen />)
    fireEvent.click(screen.getByTestId("high-contrast-toggle"))
    fireEvent.click(screen.getByTestId("simple-mode-toggle"))
    fireEvent.click(screen.getByText("Save accessibility settings"))

    await waitFor(() => {
      expect(setAccessibility).toHaveBeenCalledWith({
        textSize: "normal",
        highContrast: true,
        simplifiedMode: true,
        buttonSize: "normal",
      })
    })
  })

  it("round-trips accessibility prefs through localStorage", () => {
    saveAccessibilitySettings({
      textSize: "large",
      highContrast: true,
      simplifiedMode: true,
      buttonSize: "x-large",
    })
    expect(window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)).toBeTruthy()
    expect(loadAccessibilitySettings()).toEqual({
      textSize: "large",
      highContrast: true,
      simplifiedMode: true,
      buttonSize: "x-large",
    })
  })
})
