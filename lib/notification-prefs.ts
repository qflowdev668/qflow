export type AlertPreferenceKey =
  | "notify5Away"
  | "notify2Away"
  | "notifyTurn"
  | "notifyFaster"
  | "notifyPaused"

export type NotificationPreferences = Record<AlertPreferenceKey, boolean>

export const NOTIFICATION_PREFS_STORAGE_KEY = "qflow_notification_prefs"

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  notify5Away: true,
  notify2Away: true,
  notifyTurn: true,
  notifyFaster: false,
  notifyPaused: false,
}

/** Maps queue lifecycle / push alert kinds to a preference checkbox. */
export type AlertKind = "five_ahead" | "two_ahead" | "your_turn" | "moving_faster" | "service_paused"

const KIND_TO_PREF: Record<AlertKind, AlertPreferenceKey> = {
  five_ahead: "notify5Away",
  two_ahead: "notify2Away",
  your_turn: "notifyTurn",
  moving_faster: "notifyFaster",
  service_paused: "notifyPaused",
}

export function parseNotificationPreferences(
  raw: unknown
): NotificationPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_PREFS }
  const o = raw as Record<string, unknown>
  return {
    notify5Away: o.notify5Away !== false,
    notify2Away: o.notify2Away !== false,
    notifyTurn: o.notifyTurn !== false,
    notifyFaster: o.notifyFaster === true,
    notifyPaused: o.notifyPaused === true,
  }
}

export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_NOTIFICATION_PREFS }
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS }
    return parseNotificationPreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS }
  }
}

export function saveNotificationPreferences(
  prefs: NotificationPreferences
): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      NOTIFICATION_PREFS_STORAGE_KEY,
      JSON.stringify(prefs)
    )
  } catch {
    /* private mode */
  }
}

export function shouldSendAlert(
  prefs: NotificationPreferences,
  kind: AlertKind
): boolean {
  return prefs[KIND_TO_PREF[kind]] === true
}

/** Infer alert kind from queue status used by push-dispatch / DB triggers. */
export function alertKindFromQueueStatus(
  status: string
): AlertKind | null {
  if (status === "your-turn" || status === "serving") return "your_turn"
  if (status === "almost") return "two_ahead"
  return null
}
