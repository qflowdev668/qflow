/** Admin cellphone OTP gate — bootstrap env + DB admin_accounts. */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

export type AdminIdentity = {
  phone: string
  email: string
  name: string
  /** DB row id, or null for env bootstrap super-admin. */
  accountId: string | null
  isBootstrap: boolean
}

/** Normalize SA mobiles to 0XXXXXXXXX (10 digits). */
export function normalizeSaPhone(input: string): string {
  const digits = input.replace(/\D/g, "")
  if (digits.startsWith("27") && digits.length >= 11) {
    return `0${digits.slice(2, 11)}`
  }
  if (digits.length === 9) return `0${digits}`
  if (digits.length > 10 && digits.startsWith("0")) return digits.slice(0, 10)
  return digits
}

/** Bootstrap super-admin from env — never removable via the console. */
export function getAdminOtpConfig(): { phone: string; email: string } | null {
  const phone = normalizeSaPhone(process.env.ADMIN_OTP_PHONE || "")
  const email = (process.env.ADMIN_OTP_EMAIL || "").trim().toLowerCase()
  if (!phone || !email.includes("@")) return null
  return { phone, email }
}

export function isBootstrapAdminPhone(input: string): boolean {
  const config = getAdminOtpConfig()
  if (!config) return false
  return normalizeSaPhone(input) === config.phone
}

/**
 * Resolve an authorized admin by cellphone.
 * Env bootstrap wins when the number matches ADMIN_OTP_PHONE;
 * otherwise requires an active admin_accounts row.
 */
export async function resolveAdminByPhone(
  service: SupabaseClient<Database>,
  input: string
): Promise<AdminIdentity | null> {
  const phone = normalizeSaPhone(input)
  if (!phone || phone.length < 10) return null

  const bootstrap = getAdminOtpConfig()
  if (bootstrap && phone === bootstrap.phone) {
    return {
      phone: bootstrap.phone,
      email: bootstrap.email,
      name: "QFlow Admin",
      accountId: null,
      isBootstrap: true,
    }
  }

  const { data } = await service
    .from("admin_accounts")
    .select("id, name, cell_number, email, is_active")
    .eq("cell_number", phone)
    .maybeSingle()

  if (!data || !data.is_active) return null

  return {
    phone: data.cell_number,
    email: data.email.trim().toLowerCase(),
    name: data.name,
    accountId: data.id,
    isBootstrap: false,
  }
}

/** @deprecated Prefer resolveAdminByPhone — kept for sync checks of env-only. */
export function isAuthorizedAdminPhone(input: string): boolean {
  return isBootstrapAdminPhone(input)
}
