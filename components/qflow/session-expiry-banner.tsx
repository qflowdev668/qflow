"use client"

import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { Clock, Check, Shield, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"
import { BrandLogo } from "@/components/qflow/brand-logo"

// Session context
interface SessionState {
  isExpiringSoon: boolean
  isExpired: boolean
  timeRemaining: number // in seconds
  refreshSession: () => void
  sessionExpiresAt: Date | null
}

const SessionContext = createContext<SessionState>({
  isExpiringSoon: false,
  isExpired: false,
  timeRemaining: 0,
  refreshSession: () => {},
  sessionExpiresAt: null
})

export function useSession() {
  return useContext(SessionContext)
}

interface SessionProviderProps {
  children: React.ReactNode
}

function secondsUntil(expiresAt: Date | null): number {
  if (!expiresAt) return 0
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
}

export function SessionProvider({ children }: SessionProviderProps) {
  // Mirrors the Supabase access token expiry rather than a timer of its own
  const { sessionExpiresAt, refreshSession: refreshSupabaseSession } = useApp()
  // Compute from the expiry date on every render so a fresh login never flashes
  // "Session Expired" while a useEffect tick is still pending (timeRemaining was 0).
  const [nowTick, setNowTick] = useState(0)

  useEffect(() => {
    if (!sessionExpiresAt) return
    const interval = setInterval(() => setNowTick((n) => n + 1), 1000)
    return () => clearInterval(interval)
  }, [sessionExpiresAt])

  const refreshSession = useCallback(() => {
    void refreshSupabaseSession()
  }, [refreshSupabaseSession])

  void nowTick // re-render each second while a session is active
  const timeRemaining = secondsUntil(sessionExpiresAt)
  const isExpired = !!sessionExpiresAt && timeRemaining <= 0
  const isExpiringSoon = timeRemaining > 0 && timeRemaining <= 300 // 5 minutes

  return (
    <SessionContext.Provider value={{
      isExpiringSoon,
      isExpired,
      timeRemaining,
      refreshSession,
      sessionExpiresAt
    }}>
      {children}
    </SessionContext.Provider>
  )
}

// Session Warning Banner Component
export function SessionWarningBanner() {
  const { isExpiringSoon, isExpired, timeRemaining, refreshSession } = useSession()
  const [showRenewedToast, setShowRenewedToast] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStayLoggedIn = () => {
    refreshSession()
    setShowRenewedToast(true)
    setTimeout(() => setShowRenewedToast(false), 2000)
  }

  // Show renewed toast
  if (showRenewedToast) {
    return (
      <div className="fixed top-0 left-0 right-0 h-12 flex items-center justify-center bg-[#10B981] z-[9998] animate-slide-down">
        <div className="flex items-center gap-2 text-white">
          <Check className="w-4 h-4" />
          <span className="text-sm font-semibold">Session renewed — you&apos;re safe</span>
        </div>
      </div>
    )
  }

  // Don't show if not expiring soon or already expired (recovery screen handles that)
  if (!isExpiringSoon || isExpired) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between px-4 bg-[#F59E0B] z-[9998] animate-slide-down">
      <div className="flex items-center gap-2 text-white">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-bold">Your session expires in {formatTime(timeRemaining)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-white/90 text-xs hidden sm:block">Stay logged in to keep your spot</span>
        <Button 
          onClick={handleStayLoggedIn}
          size="sm"
          className="bg-white text-[#F59E0B] hover:bg-white/90 h-7 px-3 text-xs font-semibold rounded-lg"
        >
          Stay Logged In
        </Button>
      </div>
    </div>
  )
}

// Session Expired Recovery Screen
interface SessionExpiredScreenProps {
  onLogin: () => void
  onRejoin: () => void
}

export function SessionExpiredScreen({ onLogin, onRejoin }: SessionExpiredScreenProps) {
  const { activeQueue } = useApp()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-8">
      {/* Logo */}
      <BrandLogo variant="icon" size="md" className="mb-6" />

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
        <Shield className="w-6 h-6" />
        Session Expired
      </h1>
      <p className="text-muted-foreground mb-8">
        {activeQueue ? "Your spot in the queue is still held" : "You have been signed out"}
      </p>

      {/* Position Card */}
      {activeQueue && (
        <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-blue-600 font-medium mb-1">Position</p>
            <p className="text-4xl font-bold text-primary mb-4">#{activeQueue.position}</p>

            <div className="flex items-center justify-center gap-2 text-sm text-blue-700 mb-4">
              <MapPin className="w-4 h-4" />
              <span>{activeQueue.locationName}</span>
            </div>

            <p className="text-sm text-blue-600">Est. Wait: ~{activeQueue.estimatedWait} min</p>
          </div>
        </div>
      )}

      {/* Body Text */}
      <p className="text-center text-muted-foreground mb-8 max-w-sm">
        {activeQueue
          ? "Log back in to continue where you left off."
          : "Log back in to keep using QFlow."}
      </p>

      {/* Action Button */}
      <Button 
        onClick={activeQueue ? onLogin : onRejoin}
        className="w-full max-w-sm h-[52px] text-base font-semibold rounded-xl"
      >
        {activeQueue ? "Log Back In" : "Return to QFlow"}
      </Button>
    </div>
  )
}
