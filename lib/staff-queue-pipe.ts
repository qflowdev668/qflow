/**
 * Staff queue data pipe: join → DB → FastAPI GET /api/staff/queue → staff UI.
 *
 * Realtime is a hint only. Polling + explicit refresh keep the staff list correct
 * even when postgres_changes is delayed, filtered out by RLS, or disconnected.
 */

export const STAFF_QUEUE_POLL_MS = 3000
export const STAFF_QUEUE_REALTIME_DEBOUNCE_MS = 250

export type StaffQueueSyncStatus = "idle" | "syncing" | "live" | "error"

export type StaffQueueApiPayload = {
  entries?: unknown
  summary?: unknown
  currentlyServing?: unknown
  locationId?: string | null
  error?: string
  detail?: string
}

export type StaffQueuePipeResult =
  | { ok: true; payload: StaffQueueApiPayload }
  | { ok: false; status: number; message: string }

export function staffQueueErrorMessage(
  status: number,
  body: StaffQueueApiPayload | null
): string {
  const detail =
    (typeof body?.error === "string" && body.error) ||
    (typeof body?.detail === "string" && body.detail) ||
    null
  if (detail) return detail
  if (status === 401) return "Session expired. Sign in again."
  if (status === 403) {
    return "Staff queue blocked — check your location assignment or account status."
  }
  if (status >= 500) return "Could not load the staff queue from the server."
  return "Could not refresh the staff queue."
}

export function parseStaffQueueResponse(
  status: number,
  body: unknown
): StaffQueuePipeResult {
  const payload =
    body && typeof body === "object" ? (body as StaffQueueApiPayload) : null
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      status,
      message: staffQueueErrorMessage(status, payload),
    }
  }
  return { ok: true, payload: payload ?? {} }
}

/** Coalesce bursty Realtime events into one refresh. */
export function createDebouncedRunner(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let generation = 0

  return {
    run(fn: () => void) {
      if (timer) clearTimeout(timer)
      const gen = ++generation
      timer = setTimeout(() => {
        timer = null
        if (gen === generation) fn()
      }, delayMs)
    },
    cancel() {
      generation += 1
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}

export type PrioritySortable = {
  priorityType?: string | null
  position: number
}

export function priorityRank(type: string | null | undefined): number {
  if (type === "emergency") return 0
  if (type === "fast-track") return 1
  return 2
}

/** Stable staff waiting order: emergency → fast-track → standard, then ticket #. */
export function sortStaffQueueEntries<T extends PrioritySortable>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      priorityRank(a.priorityType) - priorityRank(b.priorityType) ||
      a.position - b.position
  )
}
