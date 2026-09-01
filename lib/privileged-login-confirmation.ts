/** Tab-scoped flags so staff/admin OTP survives auth listener races after verifyOtp. */

const STAFF_KEY = "qflow_staff_otp_confirmed"
const ADMIN_KEY = "qflow_admin_otp_confirmed"
const OTP_FLOW_KEY = "qflow_otp_flow"

export type OtpLoginFlow = "staff-login" | "admin-phone-otp" | "email-otp"

export function markStaffOtpConfirmed(): void {
  if (typeof window !== "undefined") sessionStorage.setItem(STAFF_KEY, "1")
}

export function isStaffOtpConfirmedInSession(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(STAFF_KEY) === "1"
}

export function clearStaffOtpConfirmed(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(STAFF_KEY)
}

export function markAdminOtpConfirmed(): void {
  if (typeof window !== "undefined") sessionStorage.setItem(ADMIN_KEY, "1")
}

export function isAdminOtpConfirmedInSession(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(ADMIN_KEY) === "1"
}

export function clearAdminOtpConfirmed(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(ADMIN_KEY)
}

export function setOtpLoginFlow(flow: OtpLoginFlow): void {
  if (typeof window !== "undefined") sessionStorage.setItem(OTP_FLOW_KEY, flow)
}

export function readOtpLoginFlow(): OtpLoginFlow | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(OTP_FLOW_KEY)
  if (raw === "staff-login" || raw === "admin-phone-otp" || raw === "email-otp") {
    return raw
  }
  return null
}

export function clearOtpLoginFlow(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(OTP_FLOW_KEY)
}
