import {
  getPasswordChecks,
  isStrongPassword,
  validateStrongPassword,
  PASSWORD_MIN_LENGTH,
  STRONG_PASSWORD_ERROR,
} from "@/lib/password"

describe("Password validation", () => {
  it("accepts a valid strong password", () => {
    expect(isStrongPassword("Qflow@2026Secure!")).toBe(true)
    expect(validateStrongPassword("Qflow@2026Secure!")).toBeNull()
  })

  it(`rejects passwords under ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(isStrongPassword("Short1!aA")).toBe(false)
    expect(validateStrongPassword("Short1!aA")).toBe(STRONG_PASSWORD_ERROR)
  })

  it("rejects passwords without uppercase", () => {
    expect(getPasswordChecks("qflow@2026secure!").upper).toBe(false)
    expect(isStrongPassword("qflow@2026secure!")).toBe(false)
  })

  it("rejects passwords without lowercase", () => {
    expect(getPasswordChecks("QFLOW@2026SECURE!").lower).toBe(false)
  })

  it("rejects passwords without a digit", () => {
    expect(getPasswordChecks("QflowSecure!!xx").number).toBe(false)
  })

  it("rejects passwords without a symbol", () => {
    expect(getPasswordChecks("Qflow20260326aa").symbol).toBe(false)
  })

  it("reports multiple failed checks at once", () => {
    const checks = getPasswordChecks("short")
    const failed = Object.values(checks).filter((v) => !v)
    expect(failed.length).toBeGreaterThan(1)
  })

  it("rejects empty string", () => {
    expect(isStrongPassword("")).toBe(false)
  })
})
