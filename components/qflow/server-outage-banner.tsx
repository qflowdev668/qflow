"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

const HEALTH_CHECK_INTERVAL_MS = 30_000

// Context for server outage state
interface ServerOutageContextType {
  isServerDown: boolean
  setIsServerDown: (value: boolean) => void
}

const ServerOutageContext = createContext<ServerOutageContextType>({
  isServerDown: false,
  setIsServerDown: () => {}
})

export function useServerOutage() {
  return useContext(ServerOutageContext)
}

export function ServerOutageProvider({ children }: { children: ReactNode }) {
  const [isServerDown, setIsServerDown] = useState(false)

  // Poll the backend so the banner reflects a real outage, not a manual toggle.
  // Browser-level connectivity is handled separately by the offline banner.
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    let cancelled = false

    const check = async () => {
      if (!navigator.onLine) return
      const { error } = await supabase
        .from("locations")
        .select("id", { head: true, count: "exact" })
        .limit(1)
      if (!cancelled) setIsServerDown(!!error)
    }

    void check()
    const interval = setInterval(check, HEALTH_CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <ServerOutageContext.Provider value={{ isServerDown, setIsServerDown }}>
      {children}
    </ServerOutageContext.Provider>
  )
}

export function ServerOutageBanner() {
  const { isServerDown } = useServerOutage()

  if (!isServerDown) return null

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-12 bg-[#EF4444] z-[9997] flex items-center justify-center px-4 animate-slide-down"
      style={{ maxWidth: "448px", margin: "0 auto" }}
    >
      <div className="flex items-center gap-2 text-white">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="text-sm font-medium">
          QFlow Service Disruption — Servers temporarily unavailable
        </span>
      </div>
    </div>
  )
}
