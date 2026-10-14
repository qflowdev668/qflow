"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { HomeLoadingView, NeutralSignInSkeleton } from "@/components/qflow/home-content-skeleton"
import { useT } from "@/hooks/use-t"
import { useApp } from "@/lib/app-context"
import { AUTH_SPLASH_MAX_MS, authCallbackPending, isCustomerHomePath } from "@/lib/auth-callback-flow"
import {
  authSessionSnapshot,
  beginAuthSessionRead,
  endAuthSessionRead,
  invalidateAuthSessionWatch,
  loginHref,
  publishAuthGateStatus,
  resolveAuthGateStatus,
  subscribeAuthSession,
  type AuthGateStatus,
} from "@/lib/auth-gate"
import { oauthResolutionPending, subscribeOAuthResolution } from "@/lib/auth-resolution"
import { authSplashIsActive } from "@/lib/auth-splash"
import { isPublicPath } from "@/lib/routes"
import { createClient } from "@/lib/supabase/client"

/** Same trees the callback cover renders, so the handoff does not flash white. */
export function AuthDestinationSkeleton({ pathname }: { pathname: string }) {
  if (isCustomerHomePath(pathname)) return <HomeLoadingView />
  return <NeutralSignInSkeleton />
}

function readSessionOnce(pathname: string, force = false) {
  const id = beginAuthSessionRead()
  if (id === null) return
  const finish = (hasSession: boolean) => {
    const keepUnknown =
      !force &&
      !hasSession &&
      !isPublicPath(pathname) &&
      (oauthResolutionPending() || authSplashIsActive())
    endAuthSessionRead(id, hasSession, keepUnknown)
  }
  const supabase = createClient()
  if (!supabase) {
    finish(false)
    return
  }
  void supabase.auth.getSession().then(({ data }) => {
    finish(Boolean(data.session))
  })
}

/**
 * loading: auth not ready, a code exchange, a null session before getSession()
 * settles, or the window after /auth/callback until that session is stored.
 * unauthenticated: getSession() resolved empty and nothing is in flight.
 */
export function useAuthGateStatus(): AuthGateStatus {
  const { isAuthLoading, currentUser } = useApp()
  const pathname = usePathname() || "/"
  const [oauthPending, setOauthPending] = useState(oauthResolutionPending)
  const [session, setSession] = useState(authSessionSnapshot)

  useEffect(() => subscribeOAuthResolution(() => setOauthPending(oauthResolutionPending())), [])
  useEffect(() => subscribeAuthSession(() => setSession(authSessionSnapshot())), [])

  useEffect(() => {
    if (currentUser) return
    if (typeof window === "undefined") return
    if (authCallbackPending(pathname, window.location.search)) return

    invalidateAuthSessionWatch()
    const watching = oauthResolutionPending() || authSplashIsActive()
    readSessionOnce(pathname)
    if (!watching) return

    const timer = window.setInterval(() => readSessionOnce(pathname), 50)
    const stop = window.setTimeout(() => {
      window.clearInterval(timer)
      invalidateAuthSessionWatch()
      readSessionOnce(pathname, true)
    }, AUTH_SPLASH_MAX_MS)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(stop)
    }
  }, [pathname, oauthPending, currentUser, isAuthLoading])

  const callbackPending =
    typeof window !== "undefined" &&
    authCallbackPending(pathname, window.location.search)

  const status = resolveAuthGateStatus({
    authLoading: isAuthLoading,
    oauthPending,
    callbackPending,
    hasUser: Boolean(currentUser),
    sessionChecked: currentUser ? true : session.checked,
    hasSession: currentUser ? true : session.hasSession,
    holdForSession: false,
    pathname,
  })

  useEffect(() => {
    publishAuthGateStatus(status)
  }, [status])

  return status
}

/** Redirects to /login only after the gate is unauthenticated. */
export function useRequireAuth(): AuthGateStatus {
  const status = useAuthGateStatus()
  const pathname = usePathname() || "/"
  const router = useRouter()
  const redirected = useRef<string | null>(null)

  useEffect(() => {
    if (status !== "unauthenticated") {
      redirected.current = null
      return
    }
    if (isPublicPath(pathname)) return
    const search = window.location.search
    const href = loginHref(`${pathname}${search}`)
    if (redirected.current === href) return
    redirected.current = href
    router.replace(href)
  }, [status, pathname, router])

  return status
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/"
  const { currentUser } = useApp()
  const status = useRequireAuth()
  const t = useT()

  if (isPublicPath(pathname)) return <>{children}</>
  if (status !== "authenticated" || !currentUser) {
    return (
      <div className="min-h-dvh bg-white">
        <div role="status" aria-label={t.signingYouIn}>
          <span className="sr-only">{t.signingYouIn}</span>
        </div>
        <div aria-hidden="true">
          <AuthDestinationSkeleton pathname={pathname} />
        </div>
      </div>
    )
  }
  return <>{children}</>
}
