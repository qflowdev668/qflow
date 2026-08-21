import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isPushDispatchAuthorized, sendPushToUser } from "@/lib/push"

type DispatchBody = {
  userId?: string
  title?: string
  body?: string
  url?: string
}

/**
 * Send Web Push for a queue / notification event.
 * Authorized by PUSH_DISPATCH_SECRET (DB webhook / pg_net) or staff/admin session.
 */
export async function POST(request: Request) {
  let payload: DispatchBody
  try {
    payload = (await request.json()) as DispatchBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const userId = payload.userId?.trim()
  const title = (payload.title || "QFlow").trim()
  const body = (payload.body || "").trim()
  const url = payload.url?.trim() || "/notifications"

  if (!userId || !body) {
    return NextResponse.json({ error: "userId and body are required." }, { status: 400 })
  }

  const secretOk = isPushDispatchAuthorized(request)
  if (!secretOk) {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }
  }

  const result = await sendPushToUser(userId, { title, body, url })
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 503 })
  }

  return NextResponse.json({ ok: true, sent: result.sent })
}
