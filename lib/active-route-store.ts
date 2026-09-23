/** Client store for the Mapbox route tied to an active queue entry. */

import { useEffect, useState } from "react"
import type { GeoCoords } from "@/lib/map-geolocation"
import type { RouteSummary } from "@/lib/mapbox-directions"
import type { QueueEntry } from "@/lib/app-context"

const STORAGE_KEY = "qflow-active-route-v1"

const ACTIVE_STATUSES = new Set(["waiting", "almost", "your-turn", "serving"])

export type ActiveRouteState = {
  /** Bound once the user is in line; null = directions preview before join. */
  queueEntryId: string | null
  locationId: string
  locationCoords: GeoCoords
  route: RouteSummary
}

let memory: ActiveRouteState | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function readStorage(): ActiveRouteState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActiveRouteState
    if (!parsed?.route?.geometry?.coordinates?.length || !parsed.locationId) return null
    return parsed
  } catch {
    return null
  }
}

function writeStorage(state: ActiveRouteState | null) {
  if (typeof window === "undefined") return
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* private mode */
  }
}

export function getActiveRoute(): ActiveRouteState | null {
  if (memory) return memory
  memory = readStorage()
  return memory
}

export function setActiveRoute(state: ActiveRouteState | null) {
  memory = state
  writeStorage(state)
  emit()
}

export function clearActiveRoute() {
  setActiveRoute(null)
}

/**
 * Keep the stored route aligned with the Flow Bar / active queue_entries row.
 * Clears on leave, served, no-show, or a mismatched entry.
 */
export function syncRouteToQueueLifecycle(activeQueue: QueueEntry | null) {
  const stored = getActiveRoute()
  if (!stored) return

  if (!activeQueue || !ACTIVE_STATUSES.has(activeQueue.status)) {
    if (stored.queueEntryId) clearActiveRoute()
    return
  }

  if (stored.queueEntryId && stored.queueEntryId !== activeQueue.id) {
    clearActiveRoute()
    return
  }

  if (stored.locationId !== activeQueue.locationId) {
    clearActiveRoute()
    return
  }

  if (!stored.queueEntryId) {
    setActiveRoute({ ...stored, queueEntryId: activeQueue.id })
  }
}

export function useActiveRoute(): ActiveRouteState | null {
  const [state, setState] = useState<ActiveRouteState | null>(() => getActiveRoute())

  useEffect(() => {
    const sync = () => setState(getActiveRoute())
    listeners.add(sync)
    sync()
    return () => {
      listeners.delete(sync)
    }
  }, [])

  return state
}

/** Test helper — reset memory + storage between cases. */
export function __resetActiveRouteStoreForTests() {
  memory = null
  writeStorage(null)
  emit()
}
