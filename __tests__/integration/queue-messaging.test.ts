import { getTranslations } from "@/lib/i18n"
import { formatSANumber } from "@/lib/sms-format"
import { isStrongPassword } from "@/lib/password"

describe("Integration: join messaging pipeline (pure)", () => {
  it("formats phone and validates password together", () => {
    const phone = formatSANumber("082 123 4567")
    expect(phone).toBe("+27821234567")

    const t = getTranslations("en")
    expect(t.youreInQueue).toBeTruthy()
    expect(t.notifications).toBeTruthy()

    expect(isStrongPassword("Weak")).toBe(false)
    expect(isStrongPassword("Qflow@2026Secure!")).toBe(true)
  })
})
