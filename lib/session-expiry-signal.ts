/**
 * Bridge FastAPI ``X-Session-Expires-In`` into the session warning banner.
 * AppProvider registers a listener; apiFetch applies the header on each response.
 */

type SessionExpiresListener = (expiresInSeconds: number) => void

let listener: SessionExpiresListener | null = null

export const SESSION_EXPIRES_IN_HEADER = "X-Session-Expires-In"

/** Register (or clear) the handler that updates sessionExpiresAt in app context. */
export function onSessionExpiresInHeader(fn: SessionExpiresListener | null): void {
  listener = fn
}

/** Read FastAPI session header and notify the registered listener. */
export function applySessionExpiresInFromResponse(response: Response): void {
  const raw = response.headers.get(SESSION_EXPIRES_IN_HEADER)
  if (raw == null || raw === "") return
  const seconds = Number.parseInt(raw, 10)
  if (!Number.isFinite(seconds) || seconds < 0) return
  listener?.(seconds)
}
