import {
  getTranslations,
  languageOptions,
  type Language,
} from "@/lib/i18n"

describe("Internationalisation", () => {
  it("lists all 6 South African languages", () => {
    const codes = languageOptions.map((l) => l.code)
    expect(codes).toEqual(["en", "af", "zu", "st", "xh", "tn"])
  })

  it("returns English queue strings by default", () => {
    const t = getTranslations("en")
    expect(t.youreInQueue).toBeTruthy()
    expect(t.leaveQueue).toBeTruthy()
  })

  it("returns Zulu translations", () => {
    const t = getTranslations("zu")
    expect(t.youreInQueue).toBeTruthy()
    expect(t.youreInQueue).not.toBe(getTranslations("en").youreInQueue)
  })

  it("returns Afrikaans translations", () => {
    const t = getTranslations("af")
    expect(t.youreInQueue).toBeTruthy()
  })

  it("returns Sesotho translations", () => {
    const t = getTranslations("st")
    expect(t.youreInQueue).toBeTruthy()
  })

  it("covers splash tagline in every language", () => {
    const langs: Language[] = ["en", "af", "zu", "st", "xh", "tn"]
    for (const lang of langs) {
      const t = getTranslations(lang)
      expect(t.splashTagline.length).toBeGreaterThan(0)
      expect(t.signingYouIn.length).toBeGreaterThan(0)
      expect(t.signInLinkExpired.length).toBeGreaterThan(0)
      expect(t.signInTakingLonger.length).toBeGreaterThan(0)
      expect(t.backToSignIn.length).toBeGreaterThan(0)
    }
  })

  it("covers rating gate copy in English", () => {
    const t = getTranslations("en")
    expect(t.rateOnlyAfterServed).toMatch(/served/i)
  })

  it("falls back to English for unknown language codes", () => {
    const t = getTranslations("zz" as Language)
    expect(t.youreInQueue).toBe(getTranslations("en").youreInQueue)
  })
})
