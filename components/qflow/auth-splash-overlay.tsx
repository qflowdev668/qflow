"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { exchangeAuthCodeOnce } from "@/lib/auth-code"
import {
  AUTH_SPLASH_FADE_MS,
  AUTH_SPLASH_MAX_MS,
  destinationAfterSignIn,
  isAuthCallbackPath,
  planAuthCallback,
  splashHoldMs,
} from "@/lib/auth-callback-flow"
import { authSplashIsActive, clearAuthSplash, markAuthSplash } from "@/lib/auth-splash"
import { QFlowSplash } from "@/components/qflow/qflow-splash"
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
 * Stays mounted in the app shell so the branded splash does not unmount
 * when /auth/callback replaces to the destination.
 */
export function AuthSplashOverlay() {
  const pathname = usePathname() || ""
  const router = useRouter()
  const t = useT()
  const onCallback = isAuthCallbackPath(pathname)
  const [visible, setVisible] = useState(() => onCallback || authSplashIsActive())
  const [fading, setFading] = useState(() => !onCallback && authSplashIsActive())
  const [slow, setSlow] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [trackedCallback, setTrackedCallback] = useState(onCallback)
  const startedAt = useRef(0)
  const exchangeGuard = useRef<string | null>(null)
  const routerRef = useRef(router)

  if (onCallback !== trackedCallback) {
    setTrackedCallback(onCallback)
    if (onCallback) {
      setVisible(true)
      setFading(false)
      setSlow(false)
    } else {
      setFading(true)
    }
  }

  useEffect(() => {
    routerRef.current = router
  }, [router])

  useEffect(() => {
    if (onCallback) {
      markAuthSplash()
      return
    }
    if (!fading) return
    const timer = window.setTimeout(() => {
      setVisible(false)
      setFading(false)
      clearAuthSplash()
      startedAt.current = 0
    }, AUTH_SPLASH_FADE_MS)
    return () => window.clearTimeout(timer)
  }, [fading, onCallback])

  useEffect(() => {
    if (!onCallback) return
    let active = true
    const timedOut = { current: false }
    if (startedAt.current === 0) startedAt.current = Date.now()
    const slowTimer = window.setTimeout(() => {
      timedOut.current = true
      if (active) setSlow(true)
    }, AUTH_SPLASH_MAX_MS)

    const replaceAfterHold = async (href: string) => {
      const hold = splashHoldMs(startedAt.current || Date.now(), Date.now())
      if (hold) await sleep(hold)
      if (!active || timedOut.current) return
      routerRef.current.replace(href)
    }

    const run = async () => {
      const supabase = createClient()
      if (!supabase) {
        await replaceAfterHold("/login?auth_error=Supabase+is+not+configured")
        return
      }

      const params = new URLSearchParams(window.location.search)
      const before = await supabase.auth.getSession()
      if (!active || timedOut.current) return
      const plan = planAuthCallback(params, Boolean(before.data.session))

      if (plan.kind === "expired") {
        await replaceAfterHold(`/login?auth_error=${encodeURIComponent(t.signInLinkExpired)}`)
        return
      }

      if (plan.kind === "exchange") {
        if (exchangeGuard.current !== plan.code) {
          exchangeGuard.current = plan.code
        }
        const { error } = await exchangeAuthCodeOnce(supabase, plan.code)
        if (!active || timedOut.current) return
        if (error) {
          const again = await supabase.auth.getSession()
          if (!again.data.session) {
            await replaceAfterHold(`/login?auth_error=${encodeURIComponent(t.signInLinkExpired)}`)
            return
          }
        }
      }

      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!active || timedOut.current) return
      if (!user?.id) {
        await replaceAfterHold("/login")
        return
      }

      const role = await fetchProfileRole(supabase, user.id)
      if (!active || timedOut.current) return
      if (await signOutIfPrivilegedGoogle(supabase, user, role)) {
        if (role === "staff" || role === "admin") {
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
    }
  }, [attempt, onCallback, t.signInLinkExpired])

  if (!visible) return null

  return (
    <QFlowSplash subtitle={slow ? undefined : t.signingYouIn} showDots={!slow} fading={fading}>
      {slow ? (
        <div
          data-testid="auth-splash-slow"
          className="absolute inset-x-6 bottom-16 z-10 mx-auto max-w-sm rounded-2xl bg-white p-5 text-center text-foreground"
        >
          <p className="mb-4 text-sm font-medium">{t.signInTakingLonger}</p>
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
    </QFlowSplash>
  )
}
