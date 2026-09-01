import { formatSANumber } from "@/lib/sms-format"

describe("Phone number formatting", () => {
  it("formats 10-digit SA number to E.164", () => {
    expect(formatSANumber("0821234567")).toBe("+27821234567")
  })

  it("handles number already in E.164 format", () => {
    expect(formatSANumber("+27821234567")).toBe("+27821234567")
  })

  it("handles number with spaces", () => {
    expect(formatSANumber("082 123 4567")).toBe("+27821234567")
  })

  it("handles number with dashes", () => {
    expect(formatSANumber("082-123-4567")).toBe("+27821234567")
  })

  it("returns null on invalid number", () => {
    expect(formatSANumber("12345")).toBeNull()
  })

  it("returns null for empty input", () => {
    expect(formatSANumber("")).toBeNull()
    expect(formatSANumber("abc")).toBeNull()
  })

  it("accepts 9-digit national mobiles", () => {
    expect(formatSANumber("821234567")).toBe("+27821234567")
  })

  it("rejects non-mobile national prefixes", () => {
    expect(formatSANumber("0123456789")).toBeNull()
  })
})
