"use client"

import { Home, Map, Clock, User } from "lucide-react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const { currentScreen, navigateTo, activeQueue } = useApp()
  const t = useT()

  const navItems = [
    { id: "home", label: t.navHome, icon: Home },
    { id: "map", label: t.navMap, icon: Map },
    { id: "my-queue", label: t.navMyQueue, icon: Clock },
    { id: "profile", label: t.navProfile, icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border/80 safe-area-pb">
      <div className="flex items-stretch justify-around max-w-lg mx-auto h-[72px]">
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
                "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 transition-colors relative",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn("w-6 h-6", isActive && "stroke-[2.5] text-foreground")}
                />
                {hasNotification && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-secondary rounded-full animate-pulse border-2 border-white" />
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
}
