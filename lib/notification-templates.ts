import type { Language } from "@/lib/i18n"

/**
 * Queue lifecycle alert copy for in-app notifications and Web Push.
 *
 * These replace the old SMS templates (`almost_next` / `your_turn` / `no_show`).
 * Wording is adapted from the former 6-language SMS previews in
 * `lib/i18n-user-screens.ts` (`smsPreviewTurnSoon`, etc.) without SMS length limits.
 * DB triggers and Edge push still store/send English; the client localizes on display.
 */
export type NotificationTemplateKey =
  | "almost_next"
  | "your_turn"
  | "no_show"
  | "rate_visit"

export const NOTIFICATION_TEMPLATES: Record<
  Language,
  Record<NotificationTemplateKey, string>
> = {
  en: {
    almost_next: "Get ready — you are almost next in the queue. Please come now.",
    your_turn: "It is your turn. Please head to the counter.",
    no_show: "You were marked as a no-show.",
    rate_visit: "How was your visit? Tap to rate your experience.",
  },
  af: {
    almost_next: "Maak reg — jy is amper volgende in die ry. Kom asseblief nou.",
    your_turn: "Dit is jou beurt. Gaan asseblief na die toonbank.",
    no_show: "Jy is as 'n no-show gemerk.",
    rate_visit: "Hoe was jou besoek? Tik om jou ervaring te gradeer.",
  },
  zu: {
    almost_next: "Lungela — cishe usulandelayo emgqeni. Sicela uze manje.",
    your_turn: "Sekuyithuba lakho. Sicela uye ekhawuntareni.",
    no_show: "Umakwe njengongabonakali (no-show).",
    rate_visit: "Bekunjani ukuvakashela kwakho? Thepha ukuze ulinganise.",
  },
  st: {
    almost_next: "Itokise — u batla ho ba ea latelang moleng. Ka kopo tla hona joale.",
    your_turn: "Ke nako ea hau. Ka kopo ea k'haontareng.",
    no_show: "U tšoailoe e le no-show.",
    rate_visit: "Ho ne ho le joang? Tobetsa ho fana ka lintlha.",
  },
  xh: {
    almost_next: "Lungela — phantse ungoyena ulandelayo emgceni. Nceda uze ngoku.",
    your_turn: "Lixesha lakho. Nceda uye kwikhawuntara.",
    no_show: "Uphawulwe njengongabonakaliyo (no-show).",
    rate_visit: "Ibekunjani indwendwe yakho? Cofa ukuze unike amanqaku.",
  },
  tn: {
    almost_next: "Ipaakanye — o batla go nna yo o latelang mo moleng. Tsweetswee tla jaanong.",
    your_turn: "Ke nako ya gago. Tsweetswee ya kwa khaontareng.",
    no_show: "O swailwe jaaka no-show.",
    rate_visit: "Go ne go le jang? Tobetsa go neela dintlha.",
  },
}

/** Default English bodies used when dispatching push (staff / Edge Function). */
export function notificationBody(
  key: NotificationTemplateKey,
  lang: Language = "en"
): string {
  return NOTIFICATION_TEMPLATES[lang]?.[key] ?? NOTIFICATION_TEMPLATES.en[key]
}

/**
 * Map stored English (or near-English) notification bodies from DB triggers /
 * push dispatch back to a template key for client-side localization.
 */
export function matchNotificationTemplateKey(
  message: string
): NotificationTemplateKey | null {
  const m = message.toLowerCase()
  // Check your_turn before almost_next — both may mention "turn".
  if (m.includes("your turn") || m.includes("head to the counter")) {
    return "your_turn"
  }
  if (
    m.includes("almost next") ||
    m.includes("turn is coming") ||
    m.includes("get ready") ||
    m.includes("please come now")
  ) {
    return "almost_next"
  }
  if (m.includes("no-show") || m.includes("no show")) {
    return "no_show"
  }
  if (m.includes("rate your") || m.includes("how was your visit")) {
    return "rate_visit"
  }
  return null
}

/** Localize a stored notification message for the user's language. */
export function localizeNotificationMessage(
  message: string,
  lang: Language
): string {
  const key = matchNotificationTemplateKey(message)
  if (!key) return message
  return notificationBody(key, lang)
}
