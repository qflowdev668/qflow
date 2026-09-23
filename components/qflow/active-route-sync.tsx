"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { syncRouteToQueueLifecycle } from "@/lib/active-route-store"

/** Keeps the Mapbox route store aligned with the active queue_entries row. */
export function ActiveRouteSync() {
  const { activeQueue } = useApp()

  useEffect(() => {
    syncRouteToQueueLifecycle(activeQueue)
  }, [activeQueue])

  return null
}
