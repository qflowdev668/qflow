/**
 * OAuth / email-link redirect target for Supabase Auth.
 * Uses the live browser origin in the client — never a build-time localhost URL.
 */
export function oauthCallbackRedirectUrl(origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "https://useqflow.app")

  return `${base.replace(/\/$/, "")}/auth/callback`
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
