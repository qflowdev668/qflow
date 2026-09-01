import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  sendJoinSmsIfOptedIn,
  type QueueJoinBody,
  type QueueJoinResult,
} from "@/lib/queue-join-handler"

const PROXY_TIMEOUT_MS = 8_000

export function isQueueApiEnabled(): boolean {
  return Boolean(process.env.QUEUE_API_URL?.trim())
}

function queueApiBase(): string {
  return process.env.QUEUE_API_URL!.replace(/\/$/, "")
}

/** Forward join to FastAPI; returns null if disabled or unreachable (caller falls back). */
export async function proxyQueueJoinToFastAPI(
  request: Request
): Promise<NextResponse | null> {
  if (!isQueueApiEnabled()) return null

  const supabase = await createClient()
  if (!supabase) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const accessToken = session?.access_token
  if (!accessToken) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  let body: QueueJoinBody
  try {
    body = (await request.json()) as QueueJoinBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }
    const internalSecret = process.env.QUEUE_API_INTERNAL_SECRET?.trim()
    if (internalSecret) {
      headers["X-QFlow-Internal"] = internalSecret
    }

    const upstream = await fetch(`${queueApiBase()}/queue/join`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    })

    const payload = (await upstream.json().catch(() => ({}))) as
      | QueueJoinResult
      | { detail?: string; error?: string }

    if (!upstream.ok) {
      const message =
        (payload as { detail?: string }).detail ??
        (payload as { error?: string }).error ??
        "Could not join the queue."
      return NextResponse.json({ error: message }, { status: upstream.status })
    }

    const result = payload as QueueJoinResult
    if (session.user?.id && result.locationName) {
      await sendJoinSmsIfOptedIn(
        session.user.id,
        result.locationName,
        result.position,
        result.waitMinutes
      )
    }

    return NextResponse.json(result)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function checkQueueApiHealth(): Promise<{
  status: "operational" | "degraded" | "down"
  detail: string
}> {
  if (!isQueueApiEnabled()) {
    return {
      status: "operational",
      detail: "Using inline Next.js queue handler",
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)

  try {
    const res = await fetch(`${queueApiBase()}/health`, {
      signal: controller.signal,
      cache: "no-store",
    })
    if (!res.ok) {
      return { status: "degraded", detail: `FastAPI HTTP ${res.status}` }
    }
    const data = (await res.json()) as { ok?: boolean }
    return data.ok
      ? { status: "operational", detail: "FastAPI queue service reachable" }
      : { status: "degraded", detail: "FastAPI health check failed" }
  } catch (err) {
    return {
      status: "degraded",
      detail:
        err instanceof Error
          ? `FastAPI unreachable — falling back to inline handler (${err.message})`
          : "FastAPI unreachable — falling back to inline handler",
    }
  } finally {
    clearTimeout(timer)
  }
}
