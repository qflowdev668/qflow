import { homePathForRole, pathAllowedForRole, type AppRole } from "@/lib/routes"

export const AUTH_SPLASH_MIN_MS = 400
export const AUTH_SPLASH_MAX_MS = 8000
export const AUTH_SPLASH_FADE_MS = 200
/** How long the "You're next" ticket stays before the loader fades. */
export const AUTH_SIGN_IN_TICK_MS = 350
/** How long an error callback waits for getSession before it leaves the splash. */
export const AUTH_SESSION_WAIT_MS = 700

const AUTH_STORAGE_KEY = "qflow-auth"

/** True when a session cookie or storage entry is already on this device. */
export function hasStoredAuthSession(): boolean {
  if (typeof window === "undefined") return false
  try {
    if (window.localStorage.getItem(AUTH_STORAGE_KEY)) return true
  } catch {
    // Storage can throw in private mode.
  }
  try {
    return document.cookie.split(";").some((part) => {
      const name = part.trim().split("=")[0]
      return name === AUTH_STORAGE_KEY || name.startsWith(`${AUTH_STORAGE_KEY}.`)
    })
  } catch {
    return false
  }
}

export function isAuthCallbackPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/"
  return path === "/auth/callback"
}

export function hasOAuthError(params: URLSearchParams): boolean {
  return Boolean(params.get("error") || params.get("error_code") || params.get("error_description"))
}

export type AuthCallbackPlan =
  | { kind: "enter" }
  | { kind: "exchange"; code: string }
  | { kind: "expired" }

/**
 * OAuth error params never surface raw provider text.
 * A session that already exists continues into the app.
 */
export function planAuthCallback(params: URLSearchParams, hasSession: boolean): AuthCallbackPlan {
  if (hasOAuthError(params)) {
    return hasSession ? { kind: "enter" } : { kind: "expired" }
  }
  const code = params.get("code")
  if (code) return { kind: "exchange", code }
  return { kind: "enter" }
}

export function splashHoldMs(startedAt: number, now: number, minMs = AUTH_SPLASH_MIN_MS): number {
  return Math.max(0, minMs - (now - startedAt))
}

/** First name already on the session. Does not fetch a profile. */
export function firstNameFromSessionUser(
  user: { user_metadata?: Record<string, unknown> | null } | null | undefined
): string | null {
  const meta = user?.user_metadata
  if (!meta) return null
  const given = meta.given_name
  if (typeof given === "string" && given.trim()) return given.trim().split(/\s+/)[0]
  for (const value of [meta.name, meta.full_name]) {
    if (typeof value !== "string") continue
    const first = value.trim().split(/\s+/)[0]
    if (first) return first
  }
  return null
}

export function destinationAfterSignIn(role: AppRole, lastRoute: string | null): string {
  if (lastRoute) {
    const path = (lastRoute.split("?")[0] || "/").replace(/\/$/, "") || "/"
    if (path !== "/" && !path.startsWith("/auth")) {
      const blocked = pathAllowedForRole(lastRoute, role)
      if (!blocked) return lastRoute
      if (!blocked.startsWith("/login")) return blocked
    }
  }
  return homePathForRole(role)
}
