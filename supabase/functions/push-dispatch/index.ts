/**
 * Fallback when pg_net is unavailable.
 *
 * Modes:
 * 1) Database Webhook (preferred) — Supabase Dashboard → Database → Webhooks
 *    → queue_entries UPDATE / notifications INSERT → this function URL
 * 2) Polling — call GET ?mode=poll on a schedule (Supabase Cron / external cron)
 *
 * Deploy:
 *   npm run functions:deploy
 *   # or: supabase functions deploy push-dispatch
 *
 * Secrets (supabase secrets set …):
 *   PUSH_DISPATCH_SECRET
 *   NEXT_PUBLIC_APP_URL   (or APP_URL) — e.g. https://your-app.vercel.app
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected on hosted functions
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-dispatch-secret",
}

type QueueRow = {
  id: string
  user_id: string | null
  status: string
  location_id: string
  serving_started_at?: string | null
}

type NotificationRow = {
  user_id: string
  message: string
}

type WebhookPayload = {
  type?: string
  table?: string
  record?: Record<string, unknown>
  old_record?: Record<string, unknown> | null
}

function appUrl(): string {
  return (
    Deno.env.get("NEXT_PUBLIC_APP_URL") ||
    Deno.env.get("APP_URL") ||
    ""
  ).replace(/\/$/, "")
}

function dispatchSecret(): string {
  return Deno.env.get("PUSH_DISPATCH_SECRET") || ""
}

function isAuthorized(req: Request): boolean {
  const secret = dispatchSecret()
  if (!secret) return false
  const auth = req.headers.get("authorization") || ""
  const alt = req.headers.get("x-push-dispatch-secret") || ""
  return auth === `Bearer ${secret}` || alt === secret
}

async function dispatchPush(input: {
  userId: string
  body: string
  title?: string
  url?: string
}): Promise<{ ok: boolean; error?: string }> {
  const base = appUrl()
  const secret = dispatchSecret()
  if (!base || !secret) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_APP_URL (or APP_URL) and PUSH_DISPATCH_SECRET must be set.",
    }
  }

  const res = await fetch(`${base}/api/push/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      userId: input.userId,
      title: input.title ?? "QFlow",
      body: input.body,
      url: input.url ?? "/notifications",
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, error: text || `HTTP ${res.status}` }
  }
  return { ok: true }
}

function messageForStatus(status: string): { body: string; url: string; prefKey: string } | null {
  // Keep in sync with lib/notification-templates.ts (en).
  if (status === "serving" || status === "your-turn") {
    return {
      body: "It is your turn. Please head to the counter.",
      url: "/queue",
      prefKey: "notifyTurn",
    }
  }
  if (status === "almost") {
    return {
      body: "Get ready — you are almost next in the queue. Please come now.",
      url: "/queue",
      prefKey: "notify2Away",
    }
  }
  if (status === "no-show") {
    return {
      body: "You were marked as a no-show.",
      url: "/notifications",
      prefKey: "notifyTurn", // lifecycle; still gated by turn-related alerts
    }
  }
  return null
}

async function userAllowsAlert(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  prefKey: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", userId)
    .maybeSingle()
  const prefs = (data?.notification_preferences ?? {}) as Record<string, unknown>
  // Default ON when key missing (matches client defaults for core alerts).
  if (prefKey === "notifyFaster" || prefKey === "notifyPaused") {
    return prefs[prefKey] === true
  }
  return prefs[prefKey] !== false
}

async function handleQueueChange(
  record: QueueRow,
  oldRecord: QueueRow | null
): Promise<{ dispatched: boolean; reason?: string }> {
  if (!record.user_id) {
    return { dispatched: false, reason: "walk-in or no user" }
  }

  const statusChanged = !oldRecord || oldRecord.status !== record.status
  if (!statusChanged) {
    return { dispatched: false, reason: "status unchanged" }
  }

  const msg = messageForStatus(record.status)
  if (!msg) {
    return { dispatched: false, reason: `status ${record.status} ignored` }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )
  const allowed = await userAllowsAlert(supabase, record.user_id, msg.prefKey)
  if (!allowed) {
    return { dispatched: false, reason: `user opted out of ${msg.prefKey}` }
  }

  const result = await dispatchPush({
    userId: record.user_id,
    body: msg.body,
    url: msg.url,
  })

  return {
    dispatched: result.ok,
    reason: result.error,
  }
}

async function handleNotificationInsert(
  record: NotificationRow
): Promise<{ dispatched: boolean; reason?: string }> {
  if (!record.user_id || !record.message) {
    return { dispatched: false, reason: "missing user or message" }
  }
  const result = await dispatchPush({
    userId: record.user_id,
    body: record.message,
  })
  return { dispatched: result.ok, reason: result.error }
}

async function pollRecentQueueChanges(): Promise<{
  checked: number
  dispatched: number
  errors: string[]
}> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceKey) {
    return {
      checked: 0,
      dispatched: 0,
      errors: ["SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available"],
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString()

  // Poll recently claimed tickets (serving / your-turn). Prefer webhooks for "almost".
  const { data, error } = await supabase
    .from("queue_entries")
    .select("id, user_id, status, location_id, serving_started_at")
    .in("status", ["serving", "your-turn"])
    .not("user_id", "is", null)
    .gte("serving_started_at", since)

  if (error) {
    return { checked: 0, dispatched: 0, errors: [error.message] }
  }

  const errors: string[] = []
  let dispatched = 0
  for (const row of (data ?? []) as QueueRow[]) {
    const msg = messageForStatus(row.status)
    if (!msg || !row.user_id) continue
    const result = await dispatchPush({
      userId: row.user_id,
      body: msg.body,
      url: msg.url,
    })
    if (result.ok) dispatched += 1
    else if (result.error) errors.push(result.error)
  }

  return { checked: data?.length ?? 0, dispatched, errors }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get("mode")

  // Polling fallback (cron): GET/POST ?mode=poll
  if (mode === "poll") {
    const result = await pollRecentQueueChanges()
    return new Response(JSON.stringify({ ok: true, mode: "poll", ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST (webhook) or ?mode=poll" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let payload: WebhookPayload
  try {
    payload = (await req.json()) as WebhookPayload
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const table = payload.table
  const record = payload.record
  if (!table || !record) {
    return new Response(JSON.stringify({ error: "Expected Database Webhook payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let result: { dispatched: boolean; reason?: string }

  if (table === "queue_entries") {
    result = await handleQueueChange(
      record as unknown as QueueRow,
      (payload.old_record as unknown as QueueRow) ?? null
    )
  } else if (table === "notifications") {
    result = await handleNotificationInsert(record as unknown as NotificationRow)
  } else {
    result = { dispatched: false, reason: `table ${table} ignored` }
  }

  return new Response(JSON.stringify({ ok: true, mode: "webhook", ...result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
