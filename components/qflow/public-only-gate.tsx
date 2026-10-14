"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AuthDestinationSkeleton, useAuthGateStatus } from "@/components/qflow/auth-gate"
import { useT } from "@/hooks/use-t"
import { destinationBeforeExchange } from "@/lib/auth-callback-flow"

/** Customer sign-in screens. A session must leave before the form can paint. */
export function isPublicOnlyAuthPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/"
  return (
    path === "/login" ||
    path === "/login/email" ||
    path === "/register" ||
    path === "/forgot-password"
  )
}

/**
 * loading: callback skeleton, never the form.
 * authenticated: leave for returnUrl or Home, never the form.
 * unauthenticated: the form.
 */
export function PublicOnlyGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const status = useAuthGateStatus()
  const t = useT()
  const left = useRef<string | null>(null)
  const gated = isPublicOnlyAuthPath(pathname)

  useEffect(() => {
    if (!gated || status !== "authenticated") {
      left.current = null
      return
    }
    const dest = destinationBeforeExchange(window.location.search, null)
    if (left.current === dest) return
    left.current = dest
    router.replace(dest)
  }, [gated, status, router])

  if (!gated || status === "unauthenticated") return <>{children}</>

  const dest =
    typeof window === "undefined"
      ? "/home"
      : destinationBeforeExchange(window.location.search, null)

  return (
    <div className="min-h-dvh bg-white">
      <div role="status" aria-label={t.signingYouIn}>
        <span className="sr-only">{t.signingYouIn}</span>
      </div>
      <div aria-hidden="true">
        <AuthDestinationSkeleton pathname={dest} />
      </div>
    </div>
  )
}
