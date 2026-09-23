import {
  alertKindFromQueueStatus,
  parseNotificationPreferences,
  shouldSendAlert,
} from "@/lib/notification-prefs"

describe("notification-prefs", () => {
  it("parses and defaults alert flags", () => {
    expect(parseNotificationPreferences({})).toEqual({
      notify5Away: true,
      notify2Away: true,
      notifyTurn: true,
      notifyFaster: false,
      notifyPaused: false,
    })
  })

  it("gates alerts by preference", () => {
    const prefs = parseNotificationPreferences({
      notifyTurn: false,
      notify2Away: true,
    })
    expect(shouldSendAlert(prefs, "your_turn")).toBe(false)
    expect(shouldSendAlert(prefs, "two_ahead")).toBe(true)
    expect(shouldSendAlert(prefs, "moving_faster")).toBe(false)
  })

  it("maps queue status to alert kinds", () => {
    expect(alertKindFromQueueStatus("your-turn")).toBe("your_turn")
    expect(alertKindFromQueueStatus("almost")).toBe("two_ahead")
    expect(alertKindFromQueueStatus("waiting")).toBeNull()
  })
})
