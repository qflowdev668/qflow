"use client"

import { BOTTOM_NAV_HEIGHT_PX, BOTTOM_CHROME_GAP_PX } from "@/lib/bottom-chrome"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

/**
 * Bolt-inspired 3-panel layout for user information screens:
 * 1. Hero — illustration (works without reading)
 * 2. Content — title + message
 * 3. Action — primary CTA pinned above the tab bar
 *
 * Stays inside the AppShell max-w-md column (never full-bleed past the phone frame).
 */
export function UserScreenLayout({
  illustration,
  title,
  subtitle,
  children,
  footer,
  onSkip,
  skipLabel,
  clearBottomNav = true,
  className,
}: {
  illustration: ReactNode
  title: string
  subtitle?: string
  children?: ReactNode
  footer: ReactNode
  onSkip?: () => void
  skipLabel?: string
  /** Reserve space for the portaled BottomNav (customer screens). */
  clearBottomNav?: boolean
  className?: string
}) {
  return (
    <div
      data-testid="user-screen-layout"
      className={cn(
        "relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white",
        className
      )}
    >
      {onSkip && (
        <div className="flex shrink-0 justify-end p-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {skipLabel ?? "Skip"}
          </button>
        </div>
      )}

      <div className="shrink-0 px-6 pb-4 pt-2">
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-border/60 shadow-sm">
          {illustration}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <h1 className="mb-3 text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
        {children}
      </div>

      <div
        data-testid="user-screen-layout-footer"
        className="shrink-0 border-t border-border/80 bg-white px-6 pt-6"
        style={
          clearBottomNav
            ? {
                paddingBottom: `calc(${BOTTOM_NAV_HEIGHT_PX + BOTTOM_CHROME_GAP_PX + 8}px + env(safe-area-inset-bottom, 0px))`,
              }
            : { paddingBottom: "2rem" }
        }
      >
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
        "flex w-full items-center gap-4 border-b border-border/80 py-4 text-left last:border-0",
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{label}</p>
        {sublabel && (
          <p className="mt-0.5 text-sm text-muted-foreground">{sublabel}</p>
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
        "flex min-w-[140px] flex-1 flex-col items-start rounded-2xl border border-border/80 bg-white p-4 text-left",
        "transition-colors hover:border-primary/30"
      )}
    >
      <div className={cn("mb-3 h-20 w-full overflow-hidden rounded-xl", accentBg)}>
        {illustration}
      </div>
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{subtitle}</p>
    </button>
  )
}
