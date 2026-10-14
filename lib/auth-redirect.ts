/**
 * OAuth / email-link redirect target for Supabase Auth.
 *
 * Trailing slash matches Next.js `trailingSlash: true` (`/auth/callback/`).
 * The return host is the page origin so the PKCE verifier cookie and the
 * callback stay on the same host. www and the apex host are not rewritten
 * into each other.
 */
export function oauthCallbackRedirectUrl(origin?: string): string {
  let base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "https://useqflow.app")

  if (typeof window !== "undefined") {
    let baseHost = ""
    try {
      baseHost = new URL(base).hostname
    } catch {
      baseHost = ""
    }
    const pageIsLocal = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    const baseIsLocal = /^(localhost|127\.0\.0\.1)$/i.test(baseHost)
    // A baked localhost origin must not leave a page that is already on a public host.
    if (baseIsLocal && !pageIsLocal) {
      base = window.location.origin
    }
  }

  return `${base.replace(/\/$/, "")}/auth/callback/`
}

/** Options passed to supabase.auth.signInWithOAuth for Google. */
export function googleOAuthSignInOptions(origin?: string) {
  return {
    provider: "google" as const,
    options: {
      redirectTo: oauthCallbackRedirectUrl(origin),
      queryParams: { prompt: "select_account" as const },
    },
  }
}
