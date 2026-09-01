import type { User } from "@supabase/supabase-js"

export const STAFF_GOOGLE_BLOCK_MESSAGE =
  "Staff accounts cannot use Google sign-in. Please use your email and password."

export const ADMIN_GOOGLE_BLOCK_MESSAGE =
  "Admin accounts cannot use Google sign-in. Please use your cellphone number."

/** True when this session’s primary auth provider is Google. */
export function isGoogleAuthUser(
  user: Pick<User, "app_metadata" | "identities"> | null | undefined
): boolean {
  if (!user) return false
  if (user.app_metadata?.provider === "google") return true

  const identities = user.identities ?? []
  if (identities.length === 1 && identities[0]?.provider === "google") {
    return true
  }

  return false
}

export function googleBlockMessageForRole(
  role: "staff" | "admin" | string
): string {
  return role === "admin" ? ADMIN_GOOGLE_BLOCK_MESSAGE : STAFF_GOOGLE_BLOCK_MESSAGE
}

export function googleBlockLoginPath(role: "staff" | "admin" | string): string {
  return role === "admin" ? "/login/admin" : "/login/staff"
}
