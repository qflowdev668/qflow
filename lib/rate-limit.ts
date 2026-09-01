import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { Database } from "@/lib/supabase/types"

const IDENTITY_WINDOW_MS = 15 * 60 * 1000
const IDENTITY_MAX = 3
const IP_WINDOW_MS = 60 * 60 * 1000
const IP_MAX = 10

export const RATE_LIMIT_MESSAGE = "Too many attempts. Try again in 15 minutes."

/** Sliding-window hits keyed by bucket (e.g. phone:, email:, ip:). Local/dev fallback. */
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

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  )
}

type Limiters = {
  identity: Ratelimit
  ip: Ratelimit
}

let upstashLimiters: Limiters | null | undefined

function getUpstashLimiters(): Limiters | null {
  if (upstashLimiters !== undefined) return upstashLimiters
  if (!isUpstashConfigured()) {
    upstashLimiters = null
    return null
  }

  try {
    const redis = Redis.fromEnv()
    upstashLimiters = {
      identity: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(IDENTITY_MAX, "15 m"),
        prefix: "qflow:otp:identity",
        analytics: true,
      }),
      ip: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(IP_MAX, "1 h"),
        prefix: "qflow:otp:ip",
        analytics: true,
      }),
    }
  } catch (err) {
    console.warn("[rate-limit] Upstash init failed — using in-memory fallback.", err)
    upstashLimiters = null
  }

  return upstashLimiters
}

async function enforceMemory(options: {
  request: Request
  identity: string
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
    await logRateLimitHit(`${options.route}: ${reason} (memory)`)
    return {
      ok: false,
      response: NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 }),
    }
  }

  record(identityKey, IDENTITY_WINDOW_MS, now)
  record(ipKey, IP_WINDOW_MS, now)
  return { ok: true }
}

async function enforceUpstash(
  limiters: Limiters,
  options: {
    request: Request
    identity: string
    identityKind: "phone" | "email"
    route: string
  }
): Promise<OtpRateLimitResult> {
  const ip = clientIp(options.request)
  const identityKey = `${options.identityKind}:${options.identity}`
  const ipKey = `ip:${ip}`

  const [identityResult, ipResult] = await Promise.all([
    limiters.identity.limit(identityKey),
    limiters.ip.limit(ipKey),
  ])

  // Analytics / multi-region sync — don't block the response
  void identityResult.pending
  void ipResult.pending

  if (!identityResult.success || !ipResult.success) {
    const reason = !identityResult.success
      ? `${options.identityKind} ${options.identity}`
      : `ip ${ip}`
    await logRateLimitHit(`${options.route}: ${reason} (upstash)`)
    return {
      ok: false,
      response: NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 }),
    }
  }

  return { ok: true }
}

export type OtpRateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

/**
 * Identity: max 3 OTP sends per phone/email per 15 minutes.
 * IP: max 10 requests per hour.
 * Uses Upstash Redis when configured; otherwise in-memory Map (local/dev).
 * On hit: audit_log row + 429.
 *
 * Applied via callers on:
 * - /api/admin/otp/send (admin OTP)
 * - /api/staff/login (staff OTP + resend)
 * - /api/auth/reset/send (password reset)
 */
export async function enforceOtpRateLimit(options: {
  request: Request
  /** Normalized phone or email used as the identity key. */
  identity: string
  /** "phone" | "email" — labels the identity in the bucket key and audit detail. */
  identityKind: "phone" | "email"
  route: string
}): Promise<OtpRateLimitResult> {
  const limiters = getUpstashLimiters()
  if (limiters) {
    try {
      return await enforceUpstash(limiters, options)
    } catch (err) {
      console.warn("[rate-limit] Upstash call failed — falling back to memory.", err)
      return enforceMemory(options)
    }
  }

  return enforceMemory(options)
}
