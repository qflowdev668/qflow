import {
  matchNotificationTemplateKey,
  localizeNotificationMessage,
  notificationBody,
  NOTIFICATION_TEMPLATES,
} from "@/lib/notification-templates"
import type { Language } from "@/lib/i18n"

describe("notification templates", () => {
  const langs: Language[] = ["en", "af", "zu", "st", "xh", "tn"]

  it("defines almost_next, your_turn, and no_show for all 6 languages", () => {
    for (const lang of langs) {
      expect(NOTIFICATION_TEMPLATES[lang].almost_next.length).toBeGreaterThan(10)
      expect(NOTIFICATION_TEMPLATES[lang].your_turn.length).toBeGreaterThan(10)
      expect(NOTIFICATION_TEMPLATES[lang].no_show.length).toBeGreaterThan(5)
    }
  })

  it("matches stored English DB / push bodies to template keys", () => {
    expect(matchNotificationTemplateKey("You are almost next at Clinic.")).toBe(
      "almost_next"
    )
    expect(
      matchNotificationTemplateKey("It is your turn. Please head to the counter.")
    ).toBe("your_turn")
    expect(matchNotificationTemplateKey("You were marked as a no-show.")).toBe(
      "no_show"
    )
  })

  it("localizes English bodies into the active language", () => {
    const en = "It is your turn. Please head to the counter."
    expect(localizeNotificationMessage(en, "af")).toBe(notificationBody("your_turn", "af"))
    expect(localizeNotificationMessage(en, "zu")).toBe(notificationBody("your_turn", "zu"))
  })

  it("leaves unknown messages unchanged", () => {
    expect(localizeNotificationMessage("Custom staff note", "af")).toBe(
      "Custom staff note"
    )
  })
})
