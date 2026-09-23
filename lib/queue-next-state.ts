import type { QueueStatus } from "@/lib/app-context"

/**
 * Pre-call moment on /queue: #1 in line, 0 ahead, still waiting
 * (not yet your-turn/serving — that is Flow Bar's urgent treatment).
 */
export function isAboutToBeCalled(entry: {
  position: number
  status: QueueStatus | string
} | null | undefined): boolean {
  if (!entry) return false
  const peopleAhead = Math.max(entry.position - 1, 0)
  return entry.position === 1 && peopleAhead === 0 && entry.status === "waiting"
}
