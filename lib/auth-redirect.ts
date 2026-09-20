/**
 * OAuth / email-link redirect target for Supabase Auth.
 *
 * Trailing slash matches Next.js `trailingSlash: true` (`/auth/callback/`).
 * On useqflow.app we always force the production origin so a bad env/cache
 * can never send Google OAuth back to localhost.
 */
export function oauthCallbackRedirectUrl(origin?: string): string {
  let base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "https://useqflow.app")

  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host === "useqflow.app" || host.endsWith(".useqflow.app")) {
      base = "https://useqflow.app"
    }
  }

  // Absolute safety: never emit localhost as an OAuth return URL from a prod build.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base.replace(/\/$/, ""))) {
    if (typeof window !== "undefined" && !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) {
      base = "https://useqflow.app"
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
