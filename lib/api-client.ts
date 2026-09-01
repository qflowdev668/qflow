import { createClient } from "@/lib/supabase/client"
import { applySessionExpiresInFromResponse } from "@/lib/session-expiry-signal"

/** Base URL for FastAPI. Empty string = same origin (port 8000). */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  if (typeof window !== "undefined") return ""
  return process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, "") || "http://127.0.0.1:8000"
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient()
  if (!supabase) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export type ApiFetchInit = RequestInit & {
  /** Skip Authorization header (public endpoints). */
  public?: boolean
  /** Internal: already retried after a refresh — do not loop. */
  _retriedAfterRefresh?: boolean
}

function isSessionExpiredBody(body: unknown): boolean {
  if (!body || typeof body !== "object") return false
  return (body as { code?: string }).code === "session_expired"
}

function redirectToLoginPreservingReturnUrl(): void {
  if (typeof window === "undefined") return
  const returnUrl = `${window.location.pathname}${window.location.search}`
  const params = new URLSearchParams()
  if (returnUrl && returnUrl !== "/login" && !returnUrl.startsWith("/login?")) {
    params.set("returnUrl", returnUrl)
  }
  const qs = params.toString()
  window.location.assign(qs ? `/login?${qs}` : "/login")
}

/** Pull a human-readable message from FastAPI / JSON error bodies. */
export function formatApiErrorMessage(
  payload: unknown,
  fallback = "Request failed."
): string {
  if (!payload || typeof payload !== "object") return fallback
  const body = payload as {
    error?: unknown
    detail?: unknown
    message?: unknown
    code?: unknown
  }

  const fromDetail = (detail: unknown): string | null => {
    if (typeof detail === "string" && detail.trim()) return detail.trim()
    if (Array.isArray(detail) && detail.length > 0) {
      const parts = detail
        .map((item) => {
          if (typeof item === "string") return item
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg)
          }
          return null
        })
        .filter(Boolean)
      if (parts.length) return parts.join("; ")
    }
    if (detail && typeof detail === "object") {
      const nested = detail as { error?: unknown; message?: unknown; msg?: unknown }
      if (typeof nested.error === "string" && nested.error.trim()) return nested.error.trim()
      if (typeof nested.message === "string" && nested.message.trim()) return nested.message.trim()
      if (typeof nested.msg === "string" && nested.msg.trim()) return nested.msg.trim()
    }
    return null
  }

  if (typeof body.error === "string" && body.error.trim()) return body.error.trim()
  const detailMsg = fromDetail(body.detail)
  if (detailMsg) return detailMsg
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim()
  return fallback
}

/** Authenticated fetch against the FastAPI backend. */
export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { public: isPublic, _retriedAfterRefresh, headers: initHeaders, ...rest } = init
  const headers = new Headers(initHeaders)

  if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (!isPublic) {
    const token = await getAccessToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, { ...rest, headers })

  // Backend JWT remaining lifetime → session warning banner (≤5 min).
  applySessionExpiresInFromResponse(response)

  if (isPublic || response.status !== 401 || _retriedAfterRefresh) {
    return response
  }

  let body: unknown = null
  try {
    body = await response.clone().json()
  } catch {
    return response
  }

  if (!isSessionExpiredBody(body)) {
    return response
  }

  const supabase = createClient()
  if (supabase) {
    const { data } = await supabase.auth.refreshSession()
    if (data.session?.access_token) {
      return apiFetch(path, { ...init, _retriedAfterRefresh: true })
    }
  }

  redirectToLoginPreservingReturnUrl()
  return response
}
