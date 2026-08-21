"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { writeLastRoute } from "@/lib/routes"

/** Saves the current path so a refresh can return here after splash. */
export function RoutePersistence() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) writeLastRoute(pathname)
  }, [pathname])

  return null
}
