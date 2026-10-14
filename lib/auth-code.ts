/**
 * Auth query keys that must never be saved, restored, or exchanged twice.
 * Password sign-in does not read these.
 */
export const AUTH_QUERY_KEYS = [
  "code",
  "error",
  "error_description",
  "auth_error",
  "access_token",
  "refresh_token",
] as const

export function isPkceVerifierError(message: string): boolean {
  return /pkce code verifier not found in storage/i.test(message)
}

/** Drop OAuth/PKCE params. Other query params (such as location `id`) stay. */
export function stripAuthSearchParams(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search
  const params = new URLSearchParams(raw)
  for (const key of AUTH_QUERY_KEYS) params.delete(key)
  const next = params.toString()
  return next ? `?${next}` : ""
}

type AuthSession = { user?: { id?: string } | null } | null

type CodeExchanger = {
  auth: {
    getSession: () => Promise<{ data: { session: AuthSession } }>
    exchangeCodeForSession: (code: string) => Promise<{ error: { message: string } | null }>
  }
}

const exchangeByCode = new Map<string, Promise<{ error: { message: string } | null }>>()

/**
 * Exchange an OAuth/email code once per page load.
 * A second caller with the same code shares the in-flight promise.
 * If a session already exists, or a PKCE miss happens after one does, that is success.
 */
export function exchangeAuthCodeOnce(
  supabase: CodeExchanger,
  code: string
): Promise<{ error: { message: string } | null }> {
  const existing = exchangeByCode.get(code)
  if (existing) return existing

  const pending = (async () => {
    const before = await supabase.auth.getSession()
    if (before.data.session) return { error: null }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return { error: null }

    const after = await supabase.auth.getSession()
    if (after.data.session && isPkceVerifierError(error.message)) {
      return { error: null }
    }
    return { error }
  })()

  exchangeByCode.set(code, pending)
  return pending
}

/** Test helper. Production keeps the map for the life of the page. */
export function resetAuthCodeExchange(): void {
  exchangeByCode.clear()
}
