"use client"

import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/app-context"

interface TopBarProps {
  title?: string
  showBack?: boolean
  backTo?: string
  onBack?: () => void
  rightContent?: React.ReactNode
  className?: string
  variant?: "default" | "transparent"
}

export function TopBar({ 
  title, 
  showBack = false, 
  backTo,
  onBack,
  rightContent, 
  className,
  variant = "default"
}: TopBarProps) {
  const { navigateTo } = useApp()

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (backTo) {
      navigateTo(backTo)
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-40 flex items-center justify-between h-14 px-4",
      variant === "default" && "bg-card border-b border-border",
      variant === "transparent" && "bg-transparent",
      className
    )}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showBack && (
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        {title && (
          <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
        )}
      </div>
      {rightContent && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightContent}
        </div>
      )}
    </header>
  )
}
