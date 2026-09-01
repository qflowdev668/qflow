"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

/**
 * Bolt-inspired 3-panel layout for user information screens:
 * 1. Hero — illustration (works without reading)
 * 2. Content — title + message
 * 3. Action — primary CTA pinned to bottom
 */
export function UserScreenLayout({
  illustration,
  title,
  subtitle,
  children,
  footer,
  onSkip,
  skipLabel,
  className,
}: {
  illustration: ReactNode
  title: string
  subtitle?: string
  children?: ReactNode
  footer: ReactNode
  onSkip?: () => void
  skipLabel?: string
  className?: string
}) {
  return (
    <div className={cn("fixed inset-0 bg-white flex flex-col", className)}>
      {onSkip && (
        <div className="flex justify-end p-4 shrink-0">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {skipLabel ?? "Skip"}
          </button>
        </div>
      )}

      {/* Panel 1 — visual hero */}
      <div className="px-6 pt-2 pb-4 shrink-0">
        <div className="w-full max-w-sm mx-auto overflow-hidden rounded-3xl shadow-sm border border-border/60">
          {illustration}
        </div>
      </div>

      {/* Panel 2 — message */}
      <div className="flex-1 px-6 overflow-y-auto">
        <h1 className="text-[1.75rem] leading-tight font-bold text-foreground tracking-tight mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
            {subtitle}
          </p>
        )}
        {children}
      </div>

      {/* Panel 3 — action */}
      <div className="shrink-0 p-6 pb-8 border-t border-border/80 bg-white">
        {footer}
      </div>
    </div>
  )
}

export function MenuRow({
  icon: Icon,
  label,
  sublabel,
  onClick,
  right,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  sublabel?: string
  onClick?: () => void
  right?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 py-4 text-left border-b border-border/80 last:border-0",
        className
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{label}</p>
        {sublabel && (
          <p className="text-sm text-muted-foreground mt-0.5">{sublabel}</p>
        )}
      </div>
      {right}
    </button>
  )
}

export function QuickActionTile({
  illustration,
  title,
  subtitle,
  onClick,
  accent = "primary",
}: {
  illustration: ReactNode
  title: string
  subtitle: string
  onClick: () => void
  accent?: "primary" | "secondary" | "success"
}) {
  const accentBg =
    accent === "secondary"
      ? "bg-secondary/10"
      : accent === "success"
        ? "bg-success/10"
        : "bg-primary/10"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start p-4 rounded-2xl border border-border/80 bg-white",
        "hover:border-primary/30 transition-colors text-left min-w-[140px] flex-1"
      )}
    >
      <div className={cn("w-full h-20 rounded-xl overflow-hidden mb-3", accentBg)}>
        {illustration}
      </div>
      <p className="font-bold text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-snug">{subtitle}</p>
    </button>
  )
}
