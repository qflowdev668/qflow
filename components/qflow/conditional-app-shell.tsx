"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AppShell } from "@/components/qflow/app-shell"
import { ErrorBoundary } from "@/components/qflow/error-boundary"

/**
 * /status and /display stay outside AppShell (public kiosk / outage pages).
 * ErrorBoundary still wraps them so client crashes report to POST /api/errors.
 */
export function ConditionalAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isBarePublic =
    pathname === "/status" ||
    pathname.startsWith("/status/") ||
    pathname === "/display" ||
    pathname.startsWith("/display/")

  return (
    <ErrorBoundary>
      {isBarePublic ? children : <AppShell>{children}</AppShell>}
    </ErrorBoundary>
  )
}
