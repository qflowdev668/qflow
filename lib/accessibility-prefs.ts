import type { AccessibilitySettings, ButtonSize, TextSize } from "@/lib/app-context"

export const ACCESSIBILITY_STORAGE_KEY = "qflow_accessibility"

const TEXT_SIZES: TextSize[] = ["small", "normal", "large", "x-large"]
const BUTTON_SIZES: ButtonSize[] = ["normal", "large", "x-large"]

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  textSize: "normal",
  highContrast: false,
  simplifiedMode: false,
  buttonSize: "normal",
}

export function parseAccessibilitySettings(
  raw: unknown
): AccessibilitySettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ACCESSIBILITY }
  const o = raw as Record<string, unknown>
  return {
    textSize: TEXT_SIZES.includes(o.textSize as TextSize)
      ? (o.textSize as TextSize)
      : "normal",
    highContrast: o.highContrast === true,
    simplifiedMode: o.simplifiedMode === true,
    buttonSize: BUTTON_SIZES.includes(o.buttonSize as ButtonSize)
      ? (o.buttonSize as ButtonSize)
      : "normal",
  }
}

export function loadAccessibilitySettings(): AccessibilitySettings {
  if (typeof window === "undefined") return { ...DEFAULT_ACCESSIBILITY }
  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ACCESSIBILITY }
    return parseAccessibilitySettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_ACCESSIBILITY }
  }
}

export function saveAccessibilitySettings(settings: AccessibilitySettings): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* private mode */
  }
}

/** Apply size/contrast markers for CSS (call whenever settings change). */
export function applyAccessibilityDom(settings: AccessibilitySettings): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.dataset.textSize = settings.textSize
  root.dataset.buttonSize = settings.buttonSize
  root.classList.toggle("high-contrast-mode", settings.highContrast)
}
