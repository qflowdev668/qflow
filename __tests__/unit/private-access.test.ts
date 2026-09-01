import {
  ADMIN_UNLOCK_KEY,
  STAFF_UNLOCK_KEY,
  consumeUnlockQueryParam,
  isPrivateUnlocked,
  unlockPrivateAccess,
} from "@/lib/private-access"

describe("private-access unlock helpers", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("unlockPrivateAccess sets the admin session flag", () => {
    expect(isPrivateUnlocked("admin")).toBe(false)
    unlockPrivateAccess("admin")
    expect(sessionStorage.getItem(ADMIN_UNLOCK_KEY)).toBe("1")
    expect(isPrivateUnlocked("admin")).toBe(true)
  })

  it("unlockPrivateAccess sets the staff session flag", () => {
    unlockPrivateAccess("staff")
    expect(sessionStorage.getItem(STAFF_UNLOCK_KEY)).toBe("1")
    expect(isPrivateUnlocked("staff")).toBe(true)
  })

  it("consumeUnlockQueryParam unlocks admin and returns the kind", () => {
    expect(consumeUnlockQueryParam("?unlock=admin")).toBe("admin")
    expect(isPrivateUnlocked("admin")).toBe(true)
  })

  it("consumeUnlockQueryParam ignores unrelated query params", () => {
    expect(consumeUnlockQueryParam("?foo=bar")).toBeNull()
    expect(isPrivateUnlocked("admin")).toBe(false)
  })
})
