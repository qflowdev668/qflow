import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type QueueEntry = Database["public"]["Tables"]["queue_entries"]["Row"]

const WAITING_STATUSES = ["waiting", "almost", "your-turn"] as const

export const minutesSince = (iso: string) =>
  Math.max(Math.round((Date.now() - new Date(iso).getTime()) / 60000), 0)

export function formatTicketNumber(position: number) {
  return `#${String(position).padStart(3, "0")}`
}

export async function resolveCustomerName(
  db: SupabaseClient<Database>,
  entry: Pick<QueueEntry, "user_id" | "walk_in_name" | "is_walk_in">,
  fallback = "Customer"
) {
  if (entry.is_walk_in) return entry.walk_in_name ?? "Walk-in"
  if (!entry.user_id) return fallback

  const { data: profile } = await db
    .from("profiles")
    .select("name")
    .eq("id", entry.user_id)
    .maybeSingle()

  return profile?.name ?? fallback
}

export async function loadNextWaiting(
  db: SupabaseClient<Database>,
  locationId: string
) {
  const { data } = await db
    .from("queue_entries")
    .select("position, joined_at")
    .eq("location_id", locationId)
    .in("status", [...WAITING_STATUSES])
    .order("position")
    .limit(1)

  return data?.[0] ?? null
}

export async function findActiveServing(
  db: SupabaseClient<Database>,
  locationId: string
) {
  const { data } = await db
    .from("queue_entries")
    .select("*")
    .eq("location_id", locationId)
    .eq("status", "serving")
    .order("serving_started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export type ClaimStaffEntryResult =
  | { ok: true; entry: QueueEntry }
  | { ok: false; error: string; status: number; serving?: QueueEntry }

/**
 * Claim via DB RPCs (`claim_next_queue_entry` / `claim_queue_entry`) so auth.uid()
 * and the serving lock stay atomic. Prefer FastAPI `/api/staff/queue/claim` in the app.
 */
export async function claimStaffEntry(
  db: SupabaseClient<Database>,
  locationId: string,
  _staffUserId: string,
  entryId?: string
): Promise<ClaimStaffEntryResult> {
  const serving = await findActiveServing(db, locationId)

  if (entryId && serving?.id === entryId) {
    return { ok: true, entry: serving }
  }

  if (serving) {
    return {
      ok: false,
      error:
        "Someone is already being served. Tap Complete Service on the serving screen, or finish the current ticket first.",
      status: 409,
      serving,
    }
  }

  const rpc = entryId
    ? db.rpc("claim_queue_entry", { p_entry_id: entryId })
    : db.rpc("claim_next_queue_entry", { p_location_id: locationId })

  const { data: claimed, error } = await rpc.maybeSingle()

  if (error) {
    const message = error.message || "Could not claim the queue entry."
    if (/already being served/i.test(message)) {
      const current = await findActiveServing(db, locationId)
      return {
        ok: false,
        error:
          "Someone is already being served. Tap Complete Service on the serving screen, or finish the current ticket first.",
        status: 409,
        serving: current ?? undefined,
      }
    }
    return { ok: false, error: message, status: 502 }
  }

  if (!claimed) {
    return {
      ok: false,
      error: entryId
        ? "That queue entry is no longer waiting (it may already be locked or served)."
        : "No one is waiting in this queue.",
      status: 404,
    }
  }

  return { ok: true, entry: claimed as QueueEntry }
}

export function buildServingPayload(
  entry: QueueEntry,
  customerName: string,
  next: { position: number; joined_at: string } | null
) {
  return {
    id: entry.id,
    position: entry.position,
    ticketNumber: formatTicketNumber(entry.position),
    waitTime: minutesSince(entry.joined_at),
    customerName,
    priorityType: entry.priority ?? "standard",
    priorityCategory: entry.priority_category ?? undefined,
    isWalkIn: entry.is_walk_in === true,
    userId: entry.user_id,
    locationId: entry.location_id,
    next: next
      ? {
          ticketNumber: formatTicketNumber(next.position),
          waitTime: minutesSince(next.joined_at),
        }
      : null,
  }
}
