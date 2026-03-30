"use client"

import { Home, Map, Clock, User } from "lucide-react"
import { useApp } from "@/lib/app-context"
import { cn } from "@/lib/utils"

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "map", label: "Map", icon: Map },
  { id: "my-queue", label: "My Queue", icon: Clock },
  { id: "profile", label: "Profile", icon: User },
]

export function BottomNav() {
  const { currentScreen, navigateTo, activeQueue } = useApp()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentScreen === item.id || 
            (item.id === "my-queue" && currentScreen === "my-queue")
          const hasNotification = item.id === "my-queue" && activeQueue

          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {hasNotification && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-secondary rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
