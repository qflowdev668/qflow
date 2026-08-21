/** Admin cellphone OTP gate. Phone and email must be set in server env. */

/** Normalize SA mobiles to 0XXXXXXXXX (10 digits). */
export function normalizeSaPhone(input: string): string {
  const digits = input.replace(/\D/g, "")
  if (digits.startsWith("27") && digits.length >= 11) {
    return `0${digits.slice(2, 11)}`
  }
  if (digits.length === 9) return `0${digits}`
  if (digits.length > 10 && digits.startsWith("0")) return digits.slice(0, 10)
  return digits
}

export function getAdminOtpConfig(): { phone: string; email: string } | null {
  const phone = normalizeSaPhone(process.env.ADMIN_OTP_PHONE || "")
  const email = (process.env.ADMIN_OTP_EMAIL || "").trim().toLowerCase()
  if (!phone || !email.includes("@")) return null
  return { phone, email }
}

export function isAuthorizedAdminPhone(input: string): boolean {
  const config = getAdminOtpConfig()
  if (!config) return false
  return normalizeSaPhone(input) === config.phone
}
