import {
  clearStaffOtpConfirmed,
  isStaffOtpConfirmedInSession,
  markStaffOtpConfirmed,
  readOtpLoginFlow,
  setOtpLoginFlow,
} from "@/lib/privileged-login-confirmation"

describe("privileged login confirmation", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("tracks staff OTP confirmation for the tab session", () => {
    expect(isStaffOtpConfirmedInSession()).toBe(false)
    markStaffOtpConfirmed()
    expect(isStaffOtpConfirmedInSession()).toBe(true)
    clearStaffOtpConfirmed()
    expect(isStaffOtpConfirmedInSession()).toBe(false)
  })

  it("persists OTP login flow type", () => {
    expect(readOtpLoginFlow()).toBeNull()
    setOtpLoginFlow("staff-login")
    expect(readOtpLoginFlow()).toBe("staff-login")
  })
})
