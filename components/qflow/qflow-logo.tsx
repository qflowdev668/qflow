"use client"

import { cn } from "@/lib/utils"

type QFlowLogoProps = {
  size?: "sm" | "md" | "lg" | "xl"
  animate?: boolean
  showWordmark?: boolean
  wordmarkClassName?: string
  className?: string
  tileClassName?: string
  /** Frosted tile on a blue splash vs solid primary tile on white screens */
  variant?: "solid" | "frosted"
}

const sizes = {
  sm: "w-10 h-10",
  md: "w-14 h-14 sm:w-16 sm:h-16",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
}

/** Official QFlow mark from the Lovable prototype: open ring + core. */
export function QFlowMark({
  className,
  animate = false,
  light = true,
}: {
  className?: string
  animate?: boolean
  light?: boolean
}) {
  const ring = light ? "white" : "currentColor"
  const accent = "hsl(187 94% 53%)"

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("w-full h-full", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 24C8 15.163 15.163 8 24 8"
        stroke={ring}
        strokeWidth="4"
        strokeLinecap="round"
        className={animate ? "qflow-arc qflow-arc-1" : undefined}
      />
      <path
        d="M24 8C32.837 8 40 15.163 40 24"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
        className={animate ? "qflow-arc qflow-arc-2" : undefined}
      />
      <path
        d="M40 24C40 32.837 32.837 40 24 40"
        stroke={ring}
        strokeWidth="4"
        strokeLinecap="round"
        className={animate ? "qflow-arc qflow-arc-3" : undefined}
      />
      <circle
        cx="24"
        cy="24"
        r="6"
        fill={ring}
        className={animate ? "qflow-arc-core" : undefined}
      />
    </svg>
  )
}

export function QFlowLogo({
  size = "md",
  animate = false,
  showWordmark = false,
  wordmarkClassName,
  className,
  tileClassName,
  variant = "solid",
}: QFlowLogoProps) {
  return (
    <div className={cn("flex flex-col", showWordmark && "items-center", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-3xl",
          variant === "solid" && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
          variant === "frosted" && "bg-white/20 backdrop-blur-sm",
          sizes[size],
          animate && "qflow-logo-pop",
          tileClassName
        )}
      >
        <div className="relative z-10 w-[62%] h-[62%]">
          <QFlowMark animate={animate} light />
        </div>
      </div>
      {showWordmark && (
        <p
          className={cn(
            "mt-4 text-4xl font-bold tracking-tight",
            animate && "qflow-wordmark-in",
            wordmarkClassName
          )}
        >
          QFlow
        </p>
      )}
    </div>
  )
}
