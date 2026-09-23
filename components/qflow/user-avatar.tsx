"use client"

import { User } from "lucide-react"
import { initialsFromName } from "@/lib/user-initials"
import { cn } from "@/lib/utils"

type UserAvatarProps = {
  name?: string | null
  avatarUrl?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  /** Extra overlay (spinner, camera badge) rendered inside the circle. */
  children?: React.ReactNode
}

const sizeClass = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
} as const

/**
 * Photo when avatarUrl is set; otherwise name initials (or User icon).
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  children,
}: UserAvatarProps) {
  const initials = initialsFromName(name)

  return (
    <div
      data-testid="user-avatar"
      data-has-photo={avatarUrl ? "true" : "false"}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10",
        sizeClass[size],
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase Storage URL
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          data-testid="user-avatar-photo"
        />
      ) : initials ? (
        <span className="font-bold text-primary" data-testid="user-avatar-initials">
          {initials}
        </span>
      ) : (
        <User className="h-[45%] w-[45%] text-primary" data-testid="user-avatar-fallback" />
      )}
      {children}
    </div>
  )
}
