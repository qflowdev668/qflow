"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { Loader2 } from "lucide-react"

export function SplashScreen() {
  const { navigateTo, hasCompletedOnboarding, isAuthenticated, currentUser } = useApp()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && currentUser) {
        if (currentUser.role === "admin") {
          navigateTo("admin-dashboard")
        } else if (currentUser.role === "staff") {
          navigateTo("staff-dashboard")
        } else {
          navigateTo("home")
        }
      } else if (hasCompletedOnboarding) {
        navigateTo("login")
      } else {
        navigateTo("onboarding")
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [navigateTo, hasCompletedOnboarding, isAuthenticated, currentUser])

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
        Skip the line. Not the service.
      </p>

      {/* Loading indicator */}
      <Loader2 className="w-8 h-8 text-white animate-spin" />
    </div>
  )
}
