import { homePathForRole, pathAllowedForRole, type AppRole } from "@/lib/routes"

export const AUTH_SPLASH_MIN_MS = 400
export const AUTH_SPLASH_MAX_MS = 8000
export const AUTH_SPLASH_FADE_MS = 180

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
