import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { Database } from "@/lib/supabase/types"

const IDENTITY_WINDOW_MS = 15 * 60 * 1000
const IDENTITY_MAX = 3
const IP_WINDOW_MS = 60 * 60 * 1000
const IP_MAX = 10

const RATE_LIMIT_MESSAGE = "Too many attempts. Try again in 15 minutes."

/** Sliding-window hits keyed by bucket (e.g. phone:, email:, ip:). */
const hits = new Map<string, number[]>()

function prune(key: string, windowMs: number, now: number): number[] {
  const kept = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (kept.length === 0) hits.delete(key)
  else hits.set(key, kept)
  return kept
}

function wouldExceed(key: string, windowMs: number, max: number, now: number): boolean {
  return prune(key, windowMs, now).length >= max
}

function record(key: string, windowMs: number, now: number): void {
  const kept = prune(key, windowMs, now)
  kept.push(now)
  hits.set(key, kept)
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

function getServiceAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function logRateLimitHit(detail: string): Promise<void> {
  const service = getServiceAdmin()
  if (!service) return
  try {
    await service.from("audit_log").insert({
      actor_id: null,
      actor_name: "system",
      action: "Rate limit hit",
      detail,
    })
  } catch {
    // Never fail the HTTP response because audit logging failed.
  }
}

export type OtpRateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

/**
 * Identity: max 3 OTP sends per phone/email per 15 minutes.
 * IP: max 10 requests per hour.
 * On hit: audit_log row + 429.
 */
export async function enforceOtpRateLimit(options: {
  request: Request
  /** Normalized phone or email used as the identity key. */
  identity: string
  /** "phone" | "email" — labels the identity in the bucket key and audit detail. */
  identityKind: "phone" | "email"
  route: string
}): Promise<OtpRateLimitResult> {
  const now = Date.now()
  const ip = clientIp(options.request)
  const identityKey = `${options.identityKind}:${options.identity}`
  const ipKey = `ip:${ip}`

  const identityBlocked = wouldExceed(identityKey, IDENTITY_WINDOW_MS, IDENTITY_MAX, now)
  const ipBlocked = wouldExceed(ipKey, IP_WINDOW_MS, IP_MAX, now)

  if (identityBlocked || ipBlocked) {
    const reason = identityBlocked
      ? `${options.identityKind} ${options.identity}`
      : `ip ${ip}`
    await logRateLimitHit(`${options.route}: ${reason}`)
    return {
      ok: false,
      response: NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 }),
    }
  }

  record(identityKey, IDENTITY_WINDOW_MS, now)
  record(ipKey, IP_WINDOW_MS, now)
  return { ok: true }
}

export { RATE_LIMIT_MESSAGE }
