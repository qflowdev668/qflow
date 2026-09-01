import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

/** Rating window after service is completed (served). */
export const VISIT_RATING_WINDOW_MS = 2 * 60 * 60 * 1000

export const RATE_DENIED_MESSAGE = "You can only rate after being served."

export type RateableVisit = {
  queueEntryId: string
  locationId: string
  locationName: string
  servedAt: string
}

/**
 * Eligible visit: user's most recent queue_entry must be status `served`,
 * with served_at within the last 2 hours, and no visit_ratings row yet.
 *
 * (Schema uses `served` / `served_at`, not completed / completed_at.)
 */
export async function findRateableVisit(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<RateableVisit | null> {
  const { data: entry, error } = await supabase
    .from("queue_entries")
    .select("id, location_id, status, served_at, locations(name)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !entry) return null
  if (entry.status !== "served" || !entry.served_at) return null

  const servedAt = new Date(entry.served_at).getTime()
  if (Number.isNaN(servedAt) || Date.now() - servedAt > VISIT_RATING_WINDOW_MS) {
    return null
  }

  const { data: existing } = await supabase
    .from("visit_ratings")
    .select("id")
    .eq("queue_entry_id", entry.id)
    .maybeSingle()

  if (existing) return null

  const loc = entry.locations as unknown as { name: string } | null
  return {
    queueEntryId: entry.id,
    locationId: entry.location_id,
    locationName: loc?.name ?? "Location",
    servedAt: entry.served_at,
  }
}

/** Validate a specific queue entry for rating (API insert path). */
export async function assertQueueEntryRateable(
  supabase: SupabaseClient<Database>,
  userId: string,
  queueEntryId: string
): Promise<{ ok: true; visit: RateableVisit } | { ok: false; error: string }> {
  const { data: entry, error } = await supabase
    .from("queue_entries")
    .select("id, location_id, status, served_at, user_id, locations(name)")
    .eq("id", queueEntryId)
    .maybeSingle()

  if (error || !entry || entry.user_id !== userId) {
    return { ok: false, error: RATE_DENIED_MESSAGE }
  }
  if (entry.status !== "served" || !entry.served_at) {
    return { ok: false, error: RATE_DENIED_MESSAGE }
  }

  const servedAt = new Date(entry.served_at).getTime()
  if (Number.isNaN(servedAt) || Date.now() - servedAt > VISIT_RATING_WINDOW_MS) {
    return { ok: false, error: RATE_DENIED_MESSAGE }
  }

  const { data: existing } = await supabase
    .from("visit_ratings")
    .select("id")
    .eq("queue_entry_id", entry.id)
    .maybeSingle()

  if (existing) {
    return { ok: false, error: "You have already rated this visit." }
  }

  const loc = entry.locations as unknown as { name: string } | null
  return {
    ok: true,
    visit: {
      queueEntryId: entry.id,
      locationId: entry.location_id,
      locationName: loc?.name ?? "Location",
      servedAt: entry.served_at,
    },
  }
}
