"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { exchangeAuthCodeOnce } from "@/lib/auth-code"
import {
  AUTH_SESSION_WAIT_MS,
  AUTH_SIGN_IN_TICK_MS,
  AUTH_SPLASH_FADE_MS,
  AUTH_SPLASH_MAX_MS,
  destinationAfterSignIn,
  firstNameFromSessionUser,
  hasOAuthError,
  hasStoredAuthSession,
  isAuthCallbackPath,
  planAuthCallback,
  splashHoldMs,
} from "@/lib/auth-callback-flow"
import { authSplashIsActive, clearAuthSplash, markAuthSplash } from "@/lib/auth-splash"
import { SignInLoader } from "@/components/qflow/sign-in-loader"
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
 * Stays mounted in the app shell so one SignInLoader covers
 * /auth/callback until the destination route replaces it.
 */
export function AuthSplashOverlay() {
  const pathname = usePathname() || ""
  const router = useRouter()
  const t = useT()
  const onCallback = isAuthCallbackPath(pathname)
  const [visible, setVisible] = useState(() => onCallback || authSplashIsActive())
  const [fading, setFading] = useState(() => !onCallback && authSplashIsActive())
  const [slow, setSlow] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const startedAt = useRef(0)
  const deadlineAt = useRef(0)
  const exchangeGuard = useRef<string | null>(null)
  const routerRef = useRef(router)
  const expiredMessage = useRef(t.signInLinkExpired)

  useEffect(() => {
    routerRef.current = router
  }, [router])

  useEffect(() => {
    expiredMessage.current = t.signInLinkExpired
  }, [t.signInLinkExpired])

  useEffect(() => {
    if (onCallback) {
      markAuthSplash()
      setVisible(true)
      setFading(false)
      return
    }
    setFading(true)
    const timer = window.setTimeout(() => {
      setVisible(false)
      setFading(false)
      clearAuthSplash()
      startedAt.current = 0
      deadlineAt.current = 0
    }, AUTH_SPLASH_FADE_MS)
    return () => window.clearTimeout(timer)
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

    const replaceAfterHold = async (
      href: string,
      celebrate?: { name: string | null }
    ) => {
      if (celebrate) {
        setFirstName(celebrate.name)
        setConfirmed(true)
      }
      const hold = splashHoldMs(startedAt.current || Date.now(), Date.now())
      const wait = celebrate ? Math.max(hold, AUTH_SIGN_IN_TICK_MS) : hold
      if (wait) await sleep(wait)
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
          await replaceAfterHold(destinationAfterSignIn("user", readLastRoute()), { name: null })
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
          await replaceAfterHold(destinationAfterSignIn("user", readLastRoute()), { name: null })
          return
        }
        await replaceAfterHold("/login")
        return
      }

      const knownName = firstNameFromSessionUser(user)

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
      await replaceAfterHold(dest, { name: knownName })
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
    <SignInLoader
      phase={slow ? "slow" : confirmed ? "confirmed" : "waiting"}
      fading={fading}
      firstName={firstName}
      onRetry={() => {
        exchangeGuard.current = null
        setConfirmed(false)
        setFirstName(null)
        setSlow(false)
        setAttempt((value) => value + 1)
      }}
      onBack={() => {
        clearAuthSplash()
        routerRef.current.replace("/login")
      }}
    />
  )
}
