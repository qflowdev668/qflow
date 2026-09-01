/**
 * Normalize a South African mobile number to E.164 (+27…).
 * Accepts 0XXXXXXXXX, 27XXXXXXXXX, or +27XXXXXXXXX.
 * Safe for client and server.
 */
export function formatSANumber(number: string): string | null {
  const digits = number.replace(/\D/g, "")
  if (!digits) return null

  let national: string
  if (digits.startsWith("27") && digits.length >= 11) {
    national = digits.slice(2, 11)
  } else if (digits.startsWith("0") && digits.length >= 10) {
    national = digits.slice(1, 10)
  } else if (digits.length === 9) {
    national = digits
  } else {
    return null
  }

  // SA mobiles: 6/7/8 after leading 0
  if (!/^[6-8]\d{8}$/.test(national)) return null
  return `+27${national}`
}
