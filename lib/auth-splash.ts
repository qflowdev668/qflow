/** Remembers an in-progress sign-in splash across the callback redirect. */
export const AUTH_SPLASH_KEY = "qflow_auth_splash"
const AUTH_SPLASH_FRESH_MS = 3000

export function markAuthSplash(): void {
  try {
    window.sessionStorage.setItem(AUTH_SPLASH_KEY, String(Date.now()))
  } catch {
    // Private mode or a blocked storage API should not break sign-in.
  }
}

export function authSplashIsActive(): boolean {
  try {
    const raw = window.sessionStorage.getItem(AUTH_SPLASH_KEY)
    if (!raw) return false
    const started = Number(raw)
    if (!Number.isFinite(started)) return false
    return Date.now() - started < AUTH_SPLASH_FRESH_MS
  } catch {
    return false
  }
}

export function clearAuthSplash(): void {
  try {
    window.sessionStorage.removeItem(AUTH_SPLASH_KEY)
  } catch {
    // Ignore storage failures.
  }
}
