"use client"

import { useEffect, useRef, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import {
  homePathForRole,
  pathAllowedForRole,
  readLastRoute,
  type AppRole,
} from "@/lib/routes"
import { useRouter } from "next/navigation"
import { QFlowSplash } from "@/components/qflow/qflow-splash"
import { authSplashIsActive } from "@/lib/auth-splash"

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
    if (authSplashIsActive()) {
      if (!isAuthLoading) proceedToNextScreen()
      return
    }
    if (isAuthLoading) return

    const cookieAccepted =
      typeof window !== "undefined" &&
      window.localStorage.getItem("qflow_cookie_accepted")

    if (!cookieAccepted) {
      const timer = setTimeout(() => {
        setAnimationComplete(true)
        setShowCookieNotice(true)
      }, 2500)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      proceedToNextScreen()
    }, 2500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, navigateTo])

  const dismissCookieNotice = () => {
    localStorage.setItem("qflow_cookie_accepted", "true")
    setShowCookieNotice(false)
    proceedToNextScreen()
  }

  if (authSplashIsActive()) return null

  return (
    <QFlowSplash subtitle={t.splashTagline} showDots={!animationComplete}>
      {showCookieNotice && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom">
            <h2 className="text-lg font-bold text-foreground mb-3">{t.cookieTitle}</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {t.cookieDesc}
            </p>
            <Button
              onClick={dismissCookieNotice}
              className="w-full h-12 text-base font-semibold mb-3 rounded-xl"
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
    </QFlowSplash>
  )
}
