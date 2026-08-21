import type { Location, QueueEntry, QueueStatus, UserRole } from "@/lib/app-context"
import type { Database } from "@/lib/supabase/types"

type DbLocation = Database["public"]["Tables"]["locations"]["Row"]
type DbQueueEntry = Database["public"]["Tables"]["queue_entries"]["Row"]

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Wait times are estimated rather than measured: the schema has no per-visit
 * service duration, so every screen derives from these two shared assumptions.
 */
export const AVG_SERVICE_MINUTES = 2
export const ACTIVE_STAFF = 2

export function estimateWait(peopleAhead: number): number {
  if (peopleAhead <= 0) return 0
  return Math.max(Math.round((peopleAhead * AVG_SERVICE_MINUTES) / ACTIVE_STAFF), 1)
}

export function mapDbLocation(row: DbLocation): Location {
  const queueCount = row.queue_count ?? 0
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    address: row.address,
    distance: "—",
    queueCount,
    waitTime: estimateWait(queueCount),
    capacity: row.capacity,
    isOpen: row.is_open,
    coordinates: { lat: row.lat, lng: row.lng },
    description: row.description ?? undefined,
  }
}

export function mapDbQueueEntry(
  entry: DbQueueEntry,
  location: Pick<Location, "name" | "address">,
  totalInQueue: number
): QueueEntry {
  return {
    id: entry.id,
    locationId: entry.location_id,
    locationName: location.name,
    locationAddress: location.address,
    position: entry.position,
    totalInQueue,
    estimatedWait: estimateWait(entry.position - 1),
    status: entry.status as QueueStatus,
    joinedAt: new Date(entry.joined_at),
  }
}

export function screenForRole(role: UserRole): string {
  if (role === "admin") return "admin-dashboard"
  if (role === "staff") return "staff-dashboard"
  return "home"
}

export const ADMIN_ONLY_SCREENS = [
  "admin-dashboard",
  "add-location",
  "manage-staff",
  "audit-log",
]

export const STAFF_ONLY_SCREENS = ["staff-dashboard", "staff-serving"]

export function screenAllowedForRole(
  screen: string,
  role: UserRole | null | undefined
): string {
  if (ADMIN_ONLY_SCREENS.includes(screen) && role !== "admin") {
    return role ? screenForRole(role) : "login"
  }
  if (STAFF_ONLY_SCREENS.includes(screen) && role !== "staff") {
    return role ? screenForRole(role) : "login"
  }
  return screen
}

/** Screens a freshly authenticated user should be redirected away from. */
export const PRE_AUTH_SCREENS = [
  "splash",
  "onboarding",
  "login",
  "register",
  "forgot-password",
  "verify-otp",
  "reset-password",
  "email-otp",
  "admin-phone-otp",
  "staff-login",
  "login-otp-verify",
]
