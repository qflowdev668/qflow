import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import type { Database } from "@/lib/supabase/types"

export type ResetStage = "otp_sent" | "verified"

export type ResetTokenRow = {
  id: string
  email: string
  stage: ResetStage
  expires_at: string
  consumed_at: string | null
}

const OTP_TTL_MS = 30 * 60 * 1000
const VERIFIED_TTL_MS = 15 * 60 * 1000

export function getResetServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const service = getResetServiceClient()
  if (!service) return null

  const id = randomUUID()
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

  const { error } = await service.from("password_reset_tokens").insert({
    id,
    email: email.trim().toLowerCase(),
    stage: "otp_sent",
    expires_at: expiresAt,
  })

  if (error) {
    console.error("createPasswordResetToken:", error.message)
    return null
  }
  return id
}

export async function getPasswordResetToken(
  id: string
): Promise<ResetTokenRow | null> {
  const service = getResetServiceClient()
  if (!service) return null

  const { data, error } = await service
    .from("password_reset_tokens")
    .select("id, email, stage, expires_at, consumed_at")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  if (data.consumed_at) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null

  return data as ResetTokenRow
}

export async function markPasswordResetVerified(id: string): Promise<ResetTokenRow | null> {
  const service = getResetServiceClient()
  if (!service) return null

  const existing = await getPasswordResetToken(id)
  if (!existing || existing.stage !== "otp_sent") return existing?.stage === "verified" ? existing : null

  const expiresAt = new Date(Date.now() + VERIFIED_TTL_MS).toISOString()
  const { data, error } = await service
    .from("password_reset_tokens")
    .update({ stage: "verified", expires_at: expiresAt })
    .eq("id", id)
    .is("consumed_at", null)
    .select("id, email, stage, expires_at, consumed_at")
    .maybeSingle()

  if (error || !data) return null
  return data as ResetTokenRow
}

/** Create a verified token for email-link recovery callbacks. */
export async function createVerifiedPasswordResetToken(
  email: string
): Promise<string | null> {
  const service = getResetServiceClient()
  if (!service) return null

  const id = randomUUID()
  const expiresAt = new Date(Date.now() + VERIFIED_TTL_MS).toISOString()

  const { error } = await service.from("password_reset_tokens").insert({
    id,
    email: email.trim().toLowerCase(),
    stage: "verified",
    expires_at: expiresAt,
  })

  if (error) {
    console.error("createVerifiedPasswordResetToken:", error.message)
    return null
  }
  return id
}

export async function consumePasswordResetToken(id: string): Promise<void> {
  const service = getResetServiceClient()
  if (!service) return

  await service
    .from("password_reset_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id)
}
