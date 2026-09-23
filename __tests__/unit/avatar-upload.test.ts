import { validateAvatarFile, AVATAR_MAX_BYTES } from "@/lib/avatar-upload"
import { initialsFromName } from "@/lib/user-initials"

describe("avatar-upload helpers", () => {
  it("rejects non-images and oversized files", () => {
    expect(
      validateAvatarFile(new File([""], "x.pdf", { type: "application/pdf" }))
    ).toBe("not_image")
    const big = new File([""], "x.jpg", { type: "image/jpeg" })
    Object.defineProperty(big, "size", { value: AVATAR_MAX_BYTES + 10 })
    expect(validateAvatarFile(big)).toBe("too_large")
    expect(
      validateAvatarFile(new File([""], "x.jpg", { type: "image/jpeg" }))
    ).toBeNull()
  })
})

describe("initialsFromName", () => {
  it("builds up to three initials", () => {
    expect(initialsFromName("Bongani Mathew Miya")).toBe("BMM")
    expect(initialsFromName("Ada")).toBe("A")
    expect(initialsFromName("")).toBe("")
  })
})
