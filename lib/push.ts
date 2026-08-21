import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
}

function getVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:qflow@localhost"
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject }
}

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function configureWebPush() {
  const vapid = getVapid()
  if (!vapid) return false
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
  return true
}

/** Send a Web Push to every subscription stored for the user. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configureWebPush()) {
    return { sent: 0, error: "VAPID keys are not configured." }
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return { sent: 0, error: "Supabase service role is not configured." }
  }

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)

  if (error) {
    return { sent: 0, error: error.message }
  }

  if (!rows?.length) {
    return { sent: 0 }
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/notifications",
    icon: payload.icon ?? "/icon-192.png",
  })

  let sent = 0
  const staleIds: string[] = []

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body
        )
        sent += 1
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          staleIds.push(row.id)
        }
      }
    })
  )

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds)
  }

  return { sent }
}

export function isPushDispatchAuthorized(request: Request): boolean {
  const secret = process.env.PUSH_DISPATCH_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}
