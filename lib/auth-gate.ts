import { isPublicPath } from "@/lib/routes"

/**
 * Shared sign-in gate.
 *
 * Automatic redirects to /login live here. Call sites that used to navigate
 * on their own:
 * - lib/app-context.tsx route guard (`/login?returnUrl=`)
 * - lib/api-client.ts session_expired (`window.location.assign`)
 * - proxy.ts anonymous redirect
 * - components/qflow/auth-splash-overlay.tsx failure / back paths
 * - components/qflow/private-login-gate.tsx unlock redirect
 *
 * Explicit actions (log out, "Back to sign in" buttons, onboarding) still
 * navigate, but they build the URL with loginHref().
 */
export type AuthGateStatus = "loading" | "authenticated" | "unauthenticated"

export type AuthGateInput = {
  authLoading: boolean
  oauthPending: boolean
  callbackPending: boolean
  hasUser: boolean
  sessionChecked: boolean
  hasSession: boolean
  /** Post-callback window. A null getSession() is still unknown on protected pages. */
  holdForSession: boolean
  pathname: string
}

export function resolveAuthGateStatus(input: AuthGateInput): AuthGateStatus {
  if (input.hasUser) return "authenticated"
  if (
    input.authLoading ||
    input.oauthPending ||
    input.callbackPending ||
    !input.sessionChecked
  ) {
    return "loading"
  }
  if (input.hasSession) return "authenticated"
  const path = input.pathname.split("?")[0] || "/"
  if (input.holdForSession && !isPublicPath(path)) return "loading"
  return "unauthenticated"
}

/** Only an unauthenticated protected page may go to /login. */
export function loginHrefForStatus(
  status: AuthGateStatus,
  pathname: string,
  search = ""
): string | null {
  if (status !== "unauthenticated") return null
  const path = pathname.split("?")[0] || "/"
  if (isPublicPath(path)) return null
  const extra = search ? (search.startsWith("?") ? search : `?${search}`) : ""
  return loginHref(`${pathname}${extra}`)
}

export function loginHref(
  returnPath?: string | null,
  extra?: Record<string, string>
): string {
  const parts: string[] = []
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (!value) continue
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  if (returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")) {
    const pathOnly = (returnPath.split("?")[0] || "/").replace(/\/$/, "") || "/"
    const onLogin = pathOnly === "/login" || pathOnly.startsWith("/login/")
    if (!onLogin && !isPublicPath(pathOnly)) {
      parts.push(`returnUrl=${encodeURIComponent(returnPath)}`)
    }
  }
  return parts.length ? `/login?${parts.join("&")}` : "/login"
}

type SessionSnapshot = { checked: boolean; hasSession: boolean }

let snapshot: SessionSnapshot = { checked: false, hasSession: false }
let published: AuthGateStatus = "loading"
let watchId = 0
let readInFlight = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function authSessionSnapshot(): SessionSnapshot {
  return snapshot
}

/** Starts a getSession() read. Returns null when one is already in flight. */
export function beginAuthSessionRead(): number | null {
  if (readInFlight) return null
  readInFlight = true
  return watchId
}

export function endAuthSessionRead(id: number, hasSession: boolean, keepUnknown = false) {
  readInFlight = false
  if (id !== watchId) return
  if (!hasSession && keepUnknown) {
    if (snapshot.checked || snapshot.hasSession) {
      snapshot = { checked: false, hasSession: false }
      emit()
    }
    return
  }
  const next = { checked: true, hasSession }
  if (snapshot.checked === next.checked && snapshot.hasSession === next.hasSession) return
  snapshot = next
  emit()
}

export function invalidateAuthSessionWatch() {
  watchId += 1
  readInFlight = false
  if (!snapshot.checked && !snapshot.hasSession) return
  snapshot = { checked: false, hasSession: false }
  emit()
}

export function subscribeAuthSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function publishAuthGateStatus(status: AuthGateStatus) {
  published = status
}

/** Session-expired API redirects wait until auth is no longer loading. */
export function loginRedirectAllowed(): boolean {
  return published !== "loading"
}

export function resetAuthGateForTests() {
  watchId += 1
  readInFlight = false
  snapshot = { checked: false, hasSession: false }
  published = "loading"
  listeners.clear()
}
