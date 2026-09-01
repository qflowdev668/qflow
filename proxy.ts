import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  googleBlockLoginPath,
  googleBlockMessageForRole,
  isGoogleAuthUser,
} from "@/lib/auth-providers"
import {
  homePathForRole,
  isPublicPath,
  pathAllowedForRole,
  type AppRole,
} from "@/lib/routes"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Refreshes the Supabase session and enforces role-based route access.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!url || !anonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // API and auth callback: session refresh only
  if (pathname.startsWith("/api") || pathname.startsWith("/auth")) {
    return response
  }

  let role: AppRole | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    role = (profile?.role as AppRole | undefined) ?? null
  }

  // Staff/admin must not use Google — sign out and send them to the correct login.
  if (
    user &&
    (role === "staff" || role === "admin") &&
    isGoogleAuthUser(user)
  ) {
    await supabase.auth.signOut()
    const dest = request.nextUrl.clone()
    dest.pathname = googleBlockLoginPath(role)
    dest.search = `auth_error=${encodeURIComponent(googleBlockMessageForRole(role))}`
    return NextResponse.redirect(dest)
  }

  if (!user && !isPublicPath(pathname)) {
    const login = request.nextUrl.clone()
    login.pathname = "/login"
    login.search = ""
    return NextResponse.redirect(login)
  }

  if (user && role) {
    const redirectTo = pathAllowedForRole(pathname, role)
    if (redirectTo) {
      const dest = request.nextUrl.clone()
      dest.pathname = redirectTo
      dest.search = ""
      return NextResponse.redirect(dest)
    }

    // Signed-in users hitting splash/login go to their home (client splash also handles this)
    if (pathname === "/login" || pathname === "/register" || pathname === "/onboarding") {
      const dest = request.nextUrl.clone()
      dest.pathname = homePathForRole(role)
      dest.search = ""
      return NextResponse.redirect(dest)
    }

    // /rate only when most recent visit is served within 2h and unrated
    if (pathname === "/rate" || pathname.startsWith("/rate/")) {
      if (role !== "user") {
        const dest = request.nextUrl.clone()
        dest.pathname = homePathForRole(role)
        dest.search = ""
        return NextResponse.redirect(dest)
      }

      const { data: entry } = await supabase
        .from("queue_entries")
        .select("id, status, served_at")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
      const servedRecently =
        entry?.status === "served" &&
        !!entry.served_at &&
        new Date(entry.served_at).getTime() > twoHoursAgo

      let alreadyRated = false
      if (servedRecently && entry) {
        const { data: rating } = await supabase
          .from("visit_ratings")
          .select("id")
          .eq("queue_entry_id", entry.id)
          .maybeSingle()
        alreadyRated = !!rating
      }

      if (!servedRecently || alreadyRated) {
        const dest = request.nextUrl.clone()
        dest.pathname = "/home"
        dest.search = "toast=rate_denied"
        return NextResponse.redirect(dest)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}

export const proxyConfig = config
