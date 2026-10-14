"use client"

import type { ReactNode } from "react"
import { BrandLogo } from "@/components/qflow/brand-logo"
import { cn } from "@/lib/utils"

type QFlowSplashProps = {
  subtitle?: string
  showDots?: boolean
  fading?: boolean
  /** Underlay copy. The shell overlay is the one assistive tech should read. */
  decorative?: boolean
  children?: ReactNode
}

/** Startup splash. Sign-in uses the destination skeleton cover instead. */
export function QFlowSplash({
  subtitle,
  showDots = true,
  fading = false,
  decorative = false,
  children,
}: QFlowSplashProps) {
  return (
    <div
      data-testid="qflow-splash"
      aria-hidden={decorative || undefined}
      className={cn(
        "fixed inset-0 z-[80] flex flex-col items-center justify-center bg-primary motion-reduce:transition-none transition-opacity duration-200",
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      style={{ transitionDuration: "180ms" }}
      aria-busy={showDots && !fading}
    >
      <div
        className="absolute inset-0 overflow-hidden opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center qflow-logo-pop motion-reduce:animate-none">
        <BrandLogo variant="wordmark" tone="dark" size="xl" className="mb-2" />
        {subtitle ? (
          <p data-testid="qflow-splash-subtitle" className="text-lg font-medium text-white/80">
            {subtitle}
          </p>
        ) : null}
      </div>

      {showDots ? (
        <div className="absolute bottom-20 flex gap-1.5" data-testid="qflow-splash-dots">
          <span className="qflow-load-dot motion-reduce:animate-none h-2 w-2 rounded-full bg-white/60" />
          <span className="qflow-load-dot motion-reduce:animate-none h-2 w-2 rounded-full bg-white/60" />
          <span className="qflow-load-dot motion-reduce:animate-none h-2 w-2 rounded-full bg-white/60" />
        </div>
      ) : null}

      {children}
    </div>
  )
}
