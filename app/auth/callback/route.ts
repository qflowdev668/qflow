import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createVerifiedPasswordResetToken } from "@/lib/password-reset"

/** Exchanges the OAuth / email-link code for a session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const errorDescription = searchParams.get("error_description")

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?auth_error=${encodeURIComponent(errorDescription)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/`)
  }

  const supabase = await createClient()
  if (!supabase) {
    return NextResponse.redirect(
      `${origin}/login?auth_error=${encodeURIComponent("Supabase is not configured.")}`
    )
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?auth_error=${encodeURIComponent(error.message)}`
    )
  }

  const next = searchParams.get("next")
  const type = searchParams.get("type")
  if (next === "reset-password" || type === "recovery") {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (email) {
      const rt = await createVerifiedPasswordResetToken(email)
      if (rt) {
        return NextResponse.redirect(`${origin}/forgot-password/reset?rt=${rt}`)
      }
    }
    return NextResponse.redirect(`${origin}/forgot-password/reset?recovery=1`)
  }

  return NextResponse.redirect(`${origin}/`)
}
