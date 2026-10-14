"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { exchangeAuthCodeOnce } from "@/lib/auth-code"
import { createClient } from "@/lib/supabase/client"
import {
  fetchProfileRole,
  privilegedGoogleBlockMessage,
  privilegedGoogleLoginPath,
  signOutIfPrivilegedGoogle,
} from "@/lib/privileged-session-guard"

function AuthCallbackContent() {
  const router = useRouter()

  useEffect(() => {
    let active = true

    const run = async () => {
      const supabase = createClient()
      if (!supabase) {
        if (active) router.replace("/login?auth_error=Supabase+is+not+configured")
        return
      }

      const params = new URLSearchParams(window.location.search)
      const errorDescription = params.get("error_description")
      if (errorDescription) {
        if (active) {
          router.replace(`/login?auth_error=${encodeURIComponent(errorDescription)}`)
        }
        return
      }

      const code = params.get("code")
      if (code) {
        const { error } = await exchangeAuthCodeOnce(supabase, code)
        if (!active) return
        if (error) {
          router.replace(`/login?auth_error=${encodeURIComponent(error.message)}`)
          return
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!active) return

      if (user) {
        const role = await fetchProfileRole(supabase, user.id)
        if (!active) return
        if (await signOutIfPrivilegedGoogle(supabase, user, role)) {
          if (role === "staff" || role === "admin") {
            const message = encodeURIComponent(privilegedGoogleBlockMessage(role))
            router.replace(`${privilegedGoogleLoginPath(role)}?auth_error=${message}`)
            return
          }
        }
      }

      if (active) router.replace("/")
    }

    void run()
    return () => {
      active = false
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">
      Signing you in…
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">
          Signing you in…
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
