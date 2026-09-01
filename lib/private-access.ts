/** Session-only unlocks for staff/admin login. Never shown on customer UI. */

export const ADMIN_UNLOCK_KEY = "qflow_admin_unlock"
export const STAFF_UNLOCK_KEY = "qflow_staff_unlock"

export function isPrivateUnlocked(kind: "admin" | "staff"): boolean {
  if (typeof window === "undefined") return false
  try {
    const key = kind === "admin" ? ADMIN_UNLOCK_KEY : STAFF_UNLOCK_KEY
    return sessionStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

export function unlockPrivateAccess(kind: "admin" | "staff"): void {
  if (typeof window === "undefined") return
  try {
    const key = kind === "admin" ? ADMIN_UNLOCK_KEY : STAFF_UNLOCK_KEY
    sessionStorage.setItem(key, "1")
  } catch {
    // ignore
  }
}

/**
 * One-time admin-shared links: `/login?unlock=staff` or `/login?unlock=admin`.
 * Sets sessionStorage then the caller navigates to the gated login route.
 * Emergency/onboarding fallback — primary admin unlock is 7 rapid clicks on the logo.
 * Not advertised in the customer UI — see STAFF_ONBOARDING.md.
 */
export function consumeUnlockQueryParam(
  search: string
): "admin" | "staff" | null {
  if (typeof window === "undefined") return null
  try {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search
    )
    const unlock = params.get("unlock")?.trim().toLowerCase()
    if (unlock === "staff" || unlock === "admin") {
      unlockPrivateAccess(unlock)
      return unlock
    }
  } catch {
    // ignore
  }
  return null
}
