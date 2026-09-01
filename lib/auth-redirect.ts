/**
 * OAuth / email-link redirect target for Supabase Auth.
 * Always derived from the current browser origin in the client so production
 * never falls back to a baked-in localhost URL.
 */
export function oauthCallbackRedirectUrl(origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "") ??
    process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "") ??
    ""

  if (!base) {
    throw new Error("oauthCallbackRedirectUrl requires a browser origin or NEXT_PUBLIC_APP_URL")
  }

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
