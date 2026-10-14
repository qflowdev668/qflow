"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { exchangeAuthCodeOnce } from "@/lib/auth-code"
import {
  AUTH_SESSION_WAIT_MS,
  AUTH_SPLASH_MAX_MS,
  destinationAfterSignIn,
  hasOAuthError,
  hasStoredAuthSession,
  isAuthCallbackPath,
  isCustomerHomePath,
  planAuthCallback,
  splashHoldMs,
} from "@/lib/auth-callback-flow"
import { authSplashIsActive, clearAuthSplash, markAuthSplash } from "@/lib/auth-splash"
import { HomeLoadingView, NeutralSignInSkeleton } from "@/components/qflow/home-content-skeleton"
import { useT } from "@/hooks/use-t"
import { createClient } from "@/lib/supabase/client"
import {
  fetchProfileRole,
  privilegedGoogleBlockMessage,
  privilegedGoogleLoginPath,
  signOutIfPrivilegedGoogle,
} from "@/lib/privileged-session-guard"
import { readLastRoute, type AppRole } from "@/lib/routes"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Covers /auth/callback until replace. Home uses the Home loading tree.
 * Any other destination uses a neutral skeleton so Home chrome does not flash.
 */
export function AuthSplashOverlay() {
  const pathname = usePathname() || ""
  const router = useRouter()
  const t = useT()
  const onCallback = isAuthCallbackPath(pathname)
  const [visible, setVisible] = useState(() => onCallback || authSplashIsActive())
  const [homeCover, setHomeCover] = useState(true)
  const [slow, setSlow] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const startedAt = useRef(0)
  const deadlineAt = useRef(0)
  const exchangeGuard = useRef<string | null>(null)
  const routerRef = useRef(router)
  const expiredMessage = useRef(t.signInLinkExpired)

  useEffect(() => {
    routerRef.current = router
  }, [router])

  useLayoutEffect(() => {
    if (!onCallback) return
    const params = new URLSearchParams(window.location.search)
    if (hasOAuthError(params) && !hasStoredAuthSession()) {
      setHomeCover(false)
      return
    }
    setHomeCover(isCustomerHomePath(destinationAfterSignIn("user", readLastRoute())))
  }, [attempt, onCallback])

  useEffect(() => {
    expiredMessage.current = t.signInLinkExpired
  }, [t.signInLinkExpired])

  useEffect(() => {
    if (onCallback) {
      markAuthSplash()
      setVisible(true)
      return
    }
    setVisible(false)
    clearAuthSplash()
    startedAt.current = 0
    deadlineAt.current = 0
  }, [onCallback])

  useEffect(() => {
    if (!onCallback) return
    let active = true
    const timedOut = { current: false }
    if (startedAt.current === 0) startedAt.current = Date.now()
    if (deadlineAt.current === 0) deadlineAt.current = startedAt.current + AUTH_SPLASH_MAX_MS
    const slowTimer = window.setTimeout(() => {
      timedOut.current = true
      if (active) setSlow(true)
    }, Math.max(0, deadlineAt.current - Date.now()))

    const errorNow = hasOAuthError(new URLSearchParams(window.location.search))
    const watchdog = window.setTimeout(() => {
      if (!active || !errorNow) return
      const href = hasStoredAuthSession()
        ? destinationAfterSignIn("user", readLastRoute())
        : `/login?auth_error=${encodeURIComponent(expiredMessage.current)}`
      routerRef.current.replace(href)
    }, 900)

    const replaceAfterHold = async (href: string) => {
      const home = isCustomerHomePath(href)
      if (active) setHomeCover((current) => (current === home ? current : home))
      const hold = home ? 0 : splashHoldMs(startedAt.current || Date.now(), Date.now())
      if (hold) await sleep(hold)
      if (!active || timedOut.current) return
      routerRef.current.replace(href)
    }

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const expiredLogin = `/login?auth_error=${encodeURIComponent(expiredMessage.current)}`
      const supabase = createClient()
      if (!supabase) {
        await replaceAfterHold("/login?auth_error=Supabase+is+not+configured")
        return
      }

      const pendingSession = supabase.auth.getSession().then((result) => result.data.session ?? null)
      const raced = await Promise.race([
        pendingSession.then((session) => ({ kind: "settled" as const, session })),
        sleep(hasOAuthError(params) ? AUTH_SESSION_WAIT_MS : AUTH_SPLASH_MAX_MS).then(() => ({
          kind: "timeout" as const,
          session: null,
        })),
      ])
      if (!active || timedOut.current) return

      if (raced.kind === "timeout") {
        if (hasStoredAuthSession()) {
          await replaceAfterHold(destinationAfterSignIn("user", readLastRoute()))
          return
        }
        if (hasOAuthError(params)) {
          await replaceAfterHold(expiredLogin)
          return
        }
        return
      }

      const plan = planAuthCallback(params, Boolean(raced.session))

      if (plan.kind === "expired") {
        await replaceAfterHold(expiredLogin)
        return
      }

      if (plan.kind === "exchange") {
        if (exchangeGuard.current !== plan.code) {
          exchangeGuard.current = plan.code
        }
        const { error } = await exchangeAuthCodeOnce(supabase, plan.code)
        if (!active || timedOut.current) return
        if (error) {
          const again = await Promise.race([
            supabase.auth.getSession().then((result) => result.data.session ?? null),
            sleep(AUTH_SESSION_WAIT_MS).then(() => null),
          ])
          if (!again && !hasStoredAuthSession()) {
            await replaceAfterHold(expiredLogin)
            return
          }
        }
      }

      const session =
        raced.session ??
        (await Promise.race([
          supabase.auth.getSession().then((result) => result.data.session ?? null),
          sleep(AUTH_SESSION_WAIT_MS).then(() => null),
        ]))
      const user = session?.user
      if (!active || timedOut.current) return
      if (!user?.id) {
        if (hasStoredAuthSession()) {
          await replaceAfterHold(destinationAfterSignIn("user", readLastRoute()))
          return
        }
        await replaceAfterHold("/login")
        return
      }

      const role = await Promise.race([
        fetchProfileRole(supabase, user.id),
        sleep(300).then(() => null),
      ])
      if (!active || timedOut.current) return
      if (role === "staff" || role === "admin") {
        const blocked = await Promise.race([
          signOutIfPrivilegedGoogle(supabase, user, role),
          sleep(300).then(() => false),
        ])
        if (blocked) {
          const message = encodeURIComponent(privilegedGoogleBlockMessage(role))
          await replaceAfterHold(`${privilegedGoogleLoginPath(role)}?auth_error=${message}`)
          return
        }
      }

      const dest = destinationAfterSignIn((role ?? "user") as AppRole, readLastRoute())
      await replaceAfterHold(dest)
    }

    void run()
    return () => {
      active = false
      window.clearTimeout(slowTimer)
      window.clearTimeout(watchdog)
    }
  }, [attempt, onCallback])

  if (!visible) return null

  return (
    <div
      data-testid="post-sign-in-skeleton"
      className="fixed inset-0 z-[80] overflow-y-auto bg-white"
    >
      <div className="mx-auto min-h-dvh w-full max-w-qflow bg-white">
        <div role="status" aria-label={t.signingYouIn}>
          <span className="sr-only">{t.signingYouIn}</span>
        </div>
        <div aria-hidden="true">{homeCover ? <HomeLoadingView /> : <NeutralSignInSkeleton />}</div>
        {slow ? (
        <div className="px-6 pb-10 text-center">
          <p className="mb-4 text-sm font-medium text-foreground">{t.signInTakingLonger}</p>
          <button
            type="button"
            className="mb-3 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground"
            onClick={() => {
              exchangeGuard.current = null
              setSlow(false)
              setAttempt((value) => value + 1)
            }}
          >
            {t.retry}
          </button>
          <button
            type="button"
            className="text-sm font-medium text-primary"
            onClick={() => {
              clearAuthSplash()
              routerRef.current.replace("/login")
            }}
          >
            {t.backToSignIn}
          </button>
        </div>
      ) : null}
      </div>
    </div>
  )
}
