"use client"

import { useEffect, useRef, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import {
  homePathForRole,
  pathAllowedForRole,
  readLastRoute,
  type AppRole,
} from "@/lib/routes"
import { useRouter } from "next/navigation"

export function SplashScreen() {
  const {
    navigateTo,
    hasCompletedOnboarding,
    isAuthenticated,
    currentUser,
    isAuthLoading,
  } = useApp()
  const router = useRouter()
  const t = useT()
  const [showCookieNotice, setShowCookieNotice] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)

  const routeRef = useRef({
    isAuthenticated,
    currentUser,
    hasCompletedOnboarding,
  })
  routeRef.current = { isAuthenticated, currentUser, hasCompletedOnboarding }

  const proceedToNextScreen = () => {
    const { isAuthenticated: authed, currentUser: user, hasCompletedOnboarding: onboarded } =
      routeRef.current

    if (authed && user) {
      const last = readLastRoute()
      if (last) {
        const blocked = pathAllowedForRole(last, user.role as AppRole)
        if (!blocked && last !== "/") {
          router.replace(last)
          return
        }
        if (blocked) {
          router.replace(blocked)
          return
        }
      }
      router.replace(homePathForRole(user.role as AppRole))
      return
    }

    if (onboarded) {
      navigateTo("login")
    } else {
      navigateTo("onboarding")
    }
  }

  useEffect(() => {
    // Wait until Supabase has finished the first session check so email-link
    // sign-ins aren't treated as logged-out.
    if (isAuthLoading) return

    const cookieAccepted =
      typeof window !== "undefined" &&
      window.localStorage.getItem("qflow_cookie_accepted")

    if (!cookieAccepted) {
      const timer = setTimeout(() => {
        setAnimationComplete(true)
        setShowCookieNotice(true)
      }, 2000)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      proceedToNextScreen()
    }, 2000)
    return () => clearTimeout(timer)
    // proceedToNextScreen uses refs + navigateTo; only re-arm after auth is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, navigateTo])

  const dismissCookieNotice = () => {
    localStorage.setItem("qflow_cookie_accepted", "true")
    setShowCookieNotice(false)
    proceedToNextScreen()
  }

  return (
    <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 40 40" className="w-12 h-12 text-primary">
            <path
              fill="currentColor"
              d="M20 4C11.163 4 4 11.163 4 20s7.163 16 16 16 16-7.163 16-16S28.837 4 20 4zm0 28c-6.627 0-12-5.373-12-12S13.373 8 20 8s12 5.373 12 12-5.373 12-12 12z"
            />
            <path
              fill="currentColor"
              d="M20 12c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 12c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"
            />
            <circle fill="currentColor" cx="20" cy="20" r="2" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">QFlow</h1>
      </div>

      {/* Tagline */}
      <p className="text-white/90 text-lg mb-12 text-center px-8">
        {t.splashTagline}
      </p>

      {/* Loading indicator */}
      {!animationComplete && (
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      )}

      {/* Cookie Notice Bottom Sheet - Part D */}
      {showCookieNotice && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 animate-in slide-in-from-bottom">
            <h2 className="text-lg font-bold text-foreground mb-3">{t.cookieTitle}</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {t.cookieDesc}
            </p>
            <Button
              onClick={dismissCookieNotice}
              className="w-full h-12 text-base font-semibold mb-3"
            >
              {t.cookieAccept}
            </Button>
            <button
              type="button"
              onClick={dismissCookieNotice}
              className="w-full text-center text-primary text-sm hover:underline"
            >
              {t.cookieContinue}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
