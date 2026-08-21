import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type SubscribeBody = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
  expirationTime?: number | null
}

/** Save the browser PushSubscription for the signed-in user. */
export async function POST(request: Request) {
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

  let body: SubscribeBody
  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const endpoint = body.endpoint?.trim()
  const p256dh = body.keys?.p256dh?.trim()
  const auth = body.keys?.auth?.trim()
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Incomplete push subscription." }, { status: 400 })
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/** Remove a push subscription endpoint for the signed-in user. */
export async function DELETE(request: Request) {
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

  let endpoint: string | undefined
  try {
    const body = (await request.json()) as { endpoint?: string }
    endpoint = body.endpoint?.trim()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required." }, { status: 400 })
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
