import { homePathForRole, isPublicPath, pathAllowedForRole, type AppRole } from "@/lib/routes"

export const AUTH_SPLASH_MIN_MS = 400
export const AUTH_SPLASH_MAX_MS = 8000
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

/** True while /auth/callback still has a code that has not been exchanged. */
export function authCallbackPending(pathname: string, search: string): boolean {
  if (!isAuthCallbackPath(pathname)) return false
  const raw = search.startsWith("?") ? search.slice(1) : search
  return Boolean(new URLSearchParams(raw).get("code"))
}

export type AuthResolution = {
  /** False while the session is still unknown. */
  resolved: boolean
  hasUser: boolean
  /** Null INITIAL_SESSION during OAuth. SIGNED_IN may still arrive. */
  awaitingSignIn: boolean
}

/**
 * A null INITIAL_SESSION on the callback is not a signed-out result.
 * SIGNED_IN after that null event is the success path.
 */
export function noteAuthEvent(
  state: AuthResolution,
  event: { type: string; hasSession: boolean; callbackPending: boolean }
): AuthResolution {
  if (event.type === "INITIAL_SESSION" && !event.hasSession) {
    if (event.callbackPending) {
      return { resolved: false, hasUser: false, awaitingSignIn: true }
    }
    return { resolved: true, hasUser: false, awaitingSignIn: false }
  }
  if ((event.type === "SIGNED_IN" || event.type === "INITIAL_SESSION") && event.hasSession) {
    return { resolved: true, hasUser: true, awaitingSignIn: false }
  }
  if (event.type === "SIGNED_OUT" && !event.hasSession) {
    return { resolved: true, hasUser: false, awaitingSignIn: false }
  }
  return state
}

/** Send anonymous visitors to login only after auth has resolved with no user. */
export function loginRedirectFor(state: AuthResolution, pathname: string): "/login" | null {
  if (!state.resolved || state.awaitingSignIn || state.hasUser) return null
  const path = pathname.split("?")[0] || "/"
  if (isPublicPath(path)) return null
  return "/login"
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

/** Customer Home. Staff and admin homes are separate routes. */
export function isCustomerHomePath(href: string): boolean {
  const path = (href.split("?")[0] || "/").replace(/\/$/, "") || "/"
  return path === "/home"
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

const AUTH_ENTRY_PREFIXES = ["/login", "/register", "/forgot-password", "/onboarding", "/auth"]

/** Login, signup, and other pre-auth screens are not places to land after sign-in. */
export function isAuthEntryPath(href: string): boolean {
  const path = (href.split("?")[0] || "/").replace(/\/$/, "") || "/"
  if (path === "/") return true
  return AUTH_ENTRY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

function isRestorableDestination(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !isAuthEntryPath(href)
}

/**
 * Where a successful code exchange should go. Chosen from the URL and the
 * saved route only — not from whether a session exists yet.
 */
export function destinationBeforeExchange(search: string, lastRoute: string | null): string {
  const raw = search.startsWith("?") ? search.slice(1) : search
  const returnUrl = new URLSearchParams(raw).get("returnUrl")
  if (returnUrl && isRestorableDestination(returnUrl)) return returnUrl
  if (lastRoute && isRestorableDestination(lastRoute)) return lastRoute
  return "/home"
}

export function destinationAfterSignIn(role: AppRole, lastRoute: string | null): string {
  if (lastRoute && isRestorableDestination(lastRoute)) {
    const blocked = pathAllowedForRole(lastRoute, role)
    if (!blocked) return lastRoute
    if (!blocked.startsWith("/login")) return blocked
  }
  return homePathForRole(role)
}
