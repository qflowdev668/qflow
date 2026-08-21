"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const [reconnectingDots, setReconnectingDots] = useState(0)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowReconnected(true)
        setTimeout(() => {
          setShowReconnected(false)
        }, 3000)
      }
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [wasOffline])

  // Animate reconnecting dots
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        setReconnectingDots(prev => (prev + 1) % 5)
      }, 300)
      return () => clearInterval(interval)
    }
  }, [isOnline])

  // Render reconnecting dots
  const renderDots = () => {
    return (
      <span className="inline-flex gap-0.5 ml-2">
        {[0, 1, 2, 3, 4].map(i => (
          <span 
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              i <= reconnectingDots ? "bg-white" : "bg-white/30"
            )}
          />
        ))}
      </span>
    )
  }

  // Don't render if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null
  }

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 h-11 flex items-center justify-between px-4 z-[9999] transition-transform duration-300",
        isOnline && showReconnected 
          ? "bg-[#10B981] translate-y-0" 
          : !isOnline 
            ? "bg-[#1E293B] translate-y-0" 
            : "-translate-y-full",
        className
      )}
    >
      {showReconnected ? (
        <>
          <div className="flex items-center gap-2 text-white">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Back online — queue updated</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-white">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">{"You're offline — your queue position is saved."}</span>
          </div>
          <div className="flex items-center text-white/80">
            {renderDots()}
          </div>
        </>
      )}
    </div>
  )
}

// Hook to check offline status
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOffline
}
