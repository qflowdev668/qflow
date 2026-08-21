import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
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
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}

export const proxyConfig = config
