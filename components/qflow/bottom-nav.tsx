"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Home, Map, Clock, User } from "lucide-react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { cn } from "@/lib/utils"

/**
 * Portaled to document.body so AppShell overflow-hidden does not clip the tab bar.
 * z-70 keeps tabs in front of Vaul drawers; drawers pad above this bar instead.
 */
export function BottomNav() {
  const { currentScreen, navigateTo, activeQueue } = useApp()
  const t = useT()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.dataset.hasBottomNav = "true"
    return () => {
      delete document.body.dataset.hasBottomNav
    }
  }, [])

  const navItems = [
    { id: "home", label: t.navHome, icon: Home },
    { id: "map", label: t.navMap, icon: Map },
    { id: "my-queue", label: t.navMyQueue, icon: Clock },
    { id: "profile", label: t.navProfile, icon: User },
  ]

  if (!mounted) return null

  const nav = (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 bg-white border-t border-border/80 safe-area-pb"
    >
      <div className="flex h-[72px] items-stretch justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            currentScreen === item.id ||
            (item.id === "my-queue" && currentScreen === "my-queue")
          const hasNotification = item.id === "my-queue" && activeQueue

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn("h-6 w-6", isActive && "stroke-[2.5] text-foreground")}
                />
                {hasNotification && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white bg-secondary" />
                )}
              </div>
              <span className={cn("text-xs", isActive ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )

  return createPortal(nav, document.body)
}
