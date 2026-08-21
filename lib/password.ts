/** Shared rules for every new password (register, reset, staff create). */

export const PASSWORD_MIN_LENGTH = 12

export const STRONG_PASSWORD_ERROR =
  "Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a symbol."

export type PasswordRuleId =
  | "length"
  | "lower"
  | "upper"
  | "number"
  | "symbol"

export function getPasswordChecks(password: string): Record<PasswordRuleId, boolean> {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
}

export function isStrongPassword(password: string): boolean {
  const checks = getPasswordChecks(password)
  return Object.values(checks).every(Boolean)
}

export function validateStrongPassword(password: string): string | null {
  if (!isStrongPassword(password)) return STRONG_PASSWORD_ERROR
  return null
}
