import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { estimateWait } from "@/lib/supabase/helpers"

export type QueueJoinBody = {
  locationId?: string
  priority?: "emergency" | "fast-track" | "standard"
  priorityCategory?: string | null
}

export type QueueJoinResult = {
  ok: true
  entryId?: string
  position: number
  waitMinutes: number
  locationName: string
}

/**
 * Legacy post-join SMS hook — intentionally a no-op (SMS delivery was removed).
 * Queue join must not block on outbound text messages.
 */
export async function sendJoinSmsIfOptedIn(
  _userId: string,
  _locationName: string,
  _position: number,
  _waitMinutes: number
): Promise<void> {
  return
}

/** Original Next.js queue join — used when FastAPI is off or unreachable. */
export async function handleQueueJoinInline(
  request: Request
): Promise<NextResponse> {
  const supabase = await createClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  let body: QueueJoinBody
  try {
    body = (await request.json()) as QueueJoinBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const locationId = body.locationId?.trim()
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required." }, { status: 400 })
  }

  const { data: location, error: locError } = await supabase
    .from("locations")
    .select("id, name, queue_count, is_open")
    .eq("id", locationId)
    .maybeSingle()

  if (locError || !location) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 })
  }
  if (!location.is_open) {
    return NextResponse.json({ error: "This location is closed." }, { status: 409 })
  }

  const { data: entry, error: insertError } = await supabase
    .from("queue_entries")
    .insert({
      user_id: user.id,
      location_id: locationId,
      priority: body.priority ?? "standard",
      priority_category: body.priorityCategory ?? null,
    })
    .select("id, position")
    .maybeSingle()

  if (insertError) {
    if (/duplicate key|unique|queue_entries_active_unique/i.test(insertError.message)) {
      return NextResponse.json({ error: "You are already in this queue." }, { status: 409 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const position = entry?.position ?? location.queue_count + 1
  const waitMinutes = estimateWait(Math.max(position - 1, 0))

  return NextResponse.json({
    ok: true,
    entryId: entry?.id,
    position,
    waitMinutes,
    locationName: location.name,
  } satisfies QueueJoinResult)
}
