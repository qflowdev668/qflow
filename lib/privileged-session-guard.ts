import type { SupabaseClient, User } from "@supabase/supabase-js"
import {
  googleBlockLoginPath,
  googleBlockMessageForRole,
  isGoogleAuthUser,
} from "@/lib/auth-providers"
import {
  isAdminOtpConfirmedInSession,
  isStaffOtpConfirmedInSession,
} from "@/lib/privileged-login-confirmation"

export type PrivilegedRole = "staff" | "admin"

export async function fetchProfileRole(
  supabase: SupabaseClient,
  userId: string
): Promise<"user" | "staff" | "admin" | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  const role = data?.role
  if (role === "staff" || role === "admin" || role === "user") return role
  return null
}

export function isPrivilegedRole(role: string | null | undefined): role is PrivilegedRole {
  return role === "staff" || role === "admin"
}

export type PrivilegedGoogleBlockOptions = {
  /** When true, skip blocking if staff/admin completed OTP in this tab (not for OAuth callback). */
  respectOtpBypass?: boolean
}

export function shouldBlockPrivilegedGoogle(
  authUser: User,
  role: string | null | undefined,
  options?: PrivilegedGoogleBlockOptions
): role is PrivilegedRole {
  if (!isPrivilegedRole(role)) return false
  if (options?.respectOtpBypass) {
    if (role === "admin" && isAdminOtpConfirmedInSession()) return false
    if (role === "staff" && isStaffOtpConfirmedInSession()) return false
  }
  return isGoogleAuthUser(authUser)
}

export function privilegedGoogleBlockMessage(role: PrivilegedRole): string {
  return googleBlockMessageForRole(role)
}

export function privilegedGoogleLoginScreen(role: PrivilegedRole): string {
  return role === "admin" ? "admin-phone-otp" : "staff-login"
}

export function privilegedGoogleLoginPath(role: PrivilegedRole): string {
  return googleBlockLoginPath(role)
}

/** Sign out staff/admin sessions that used Google (not allowed). Returns true if blocked. */
export async function signOutIfPrivilegedGoogle(
  supabase: SupabaseClient,
  authUser: User,
  role: string | null | undefined,
  options?: PrivilegedGoogleBlockOptions
): Promise<boolean> {
  if (!shouldBlockPrivilegedGoogle(authUser, role, options)) return false
  await supabase.auth.signOut()
  return true
}
