import { stripAuthSearchParams } from "@/lib/auth-code"

export type AppRole = "user" | "staff" | "admin"

export const LAST_ROUTE_KEY = "qflow_last_route"

/** Screen ids used by navigateTo() → App Router paths. */
export const SCREEN_PATHS: Record<string, string> = {
  splash: "/",
  onboarding: "/onboarding",
  login: "/login",
  register: "/register",
  "forgot-password": "/forgot-password",
  "verify-otp": "/forgot-password/verify",
  "reset-password": "/forgot-password/reset",
  "email-otp": "/login/email",
  "admin-phone-otp": "/login/admin",
  "staff-login": "/login/staff",
  "login-otp-verify": "/login/otp",
  home: "/home",
  map: "/map",
  "my-queue": "/queue",
  profile: "/profile",
  "edit-profile": "/profile/edit",
  "help-support": "/help",
  "system-status": "/status",
  "language-selection": "/profile/language",
  "accessibility-settings": "/profile/accessibility",
  "notification-settings": "/profile/notifications",
  notifications: "/notifications",
  "rate-experience": "/rate",
  "staff-dashboard": "/staff",
  "staff-serving": "/staff/serving",
  "admin-dashboard": "/admin",
  "add-location": "/admin/locations/new",
  "manage-staff": "/admin/staff",
  "manage-admins": "/admin/admins",
  "audit-log": "/admin/audit",
}

const PATH_TO_SCREEN: Record<string, string> = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen])
)

/**
 * Static export only prerenders `/location/_/`. Real location ids go in `?id=`
 * so the client router never requests a missing `/location/{uuid}/` page
 * (which FastAPI used to fill with the splash HTML).
 */
export function pathForScreen(
  screen: string,
  locationId?: string | null
): string {
  if (screen === "location-detail") {
    return locationId
      ? `/location/_/?id=${encodeURIComponent(locationId)}`
      : "/home"
  }
  if (screen === "join-queue-confirmation") {
    return locationId
      ? `/location/_/join/?id=${encodeURIComponent(locationId)}`
      : "/home"
  }
  return SCREEN_PATHS[screen] ?? "/"
}

export function screenFromPath(pathname: string): string {
  const path = pathname.replace(/\/$/, "") || "/"
  if (path.endsWith("/join") && path.startsWith("/location/")) {
    return "join-queue-confirmation"
  }
  if (path.startsWith("/location/")) {
    return "location-detail"
  }
  return PATH_TO_SCREEN[path] ?? PATH_TO_SCREEN[pathname] ?? "splash"
}

export function locationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/location\/([^/]+)/)
  const id = match?.[1] ?? null
  if (!id || id === "_") return null
  return id
}

/** Resolve a location id from the static `/location/_/?id=` URL (or a legacy path). */
export function locationIdFromUrl(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const fromQuery = params.get("id")?.trim()
  if (fromQuery) return fromQuery
  return locationIdFromPath(pathname)
}

export const PUBLIC_PATH_PREFIXES = [
  "/",
  "/onboarding",
  "/login",
  "/register",
  "/forgot-password",
  "/auth",
  "/status",
  "/display",
  "/help",
]

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`))
  )
}

export function homePathForRole(role: AppRole): string {
  if (role === "admin") return "/admin"
  if (role === "staff") return "/staff"
  return "/home"
}

export function pathAllowedForRole(
  pathname: string,
  role: AppRole | null | undefined
): string | null {
  const path = pathname.split("?")[0] || "/"
  if (isPublicPath(path)) return null

  if (path.startsWith("/admin")) {
    if (role !== "admin") return role ? homePathForRole(role) : "/login"
    return null
  }

  if (path.startsWith("/staff")) {
    if (role !== "staff") return role ? homePathForRole(role) : "/login"
    return null
  }

  // User app surfaces — staff/admin are sent to their dashboards
  const userApp =
    path.startsWith("/home") ||
    path.startsWith("/map") ||
    path.startsWith("/location") ||
    path.startsWith("/queue") ||
    path.startsWith("/profile") ||
    path.startsWith("/notifications") ||
    path.startsWith("/help") ||
    path.startsWith("/rate")

  if (userApp) {
    if (!role) return "/login"
    if (role === "staff" || role === "admin") return homePathForRole(role)
  }

  return null
}

export function shouldPersistPath(pathname: string): boolean {
  if (pathname === "/") return false
  if (pathname.startsWith("/login/otp")) return false
  if (pathname.startsWith("/auth")) return false
  return true
}

export function readLastRoute(): string | null {
  if (typeof window === "undefined") return null
  const stored = window.sessionStorage.getItem(LAST_ROUTE_KEY)
  if (!stored) return null
  const queryAt = stored.indexOf("?")
  if (queryAt === -1) return stored
  const cleaned = `${stored.slice(0, queryAt)}${stripAuthSearchParams(stored.slice(queryAt))}`
  if (cleaned !== stored) {
    window.sessionStorage.setItem(LAST_ROUTE_KEY, cleaned)
  }
  return cleaned
}

export function writeLastRoute(pathname: string): void {
  if (typeof window === "undefined") return
  if (!shouldPersistPath(pathname)) return
  const search = stripAuthSearchParams(window.location.search ?? "")
  window.sessionStorage.setItem(LAST_ROUTE_KEY, `${pathname}${search}`)
}

export function clearLastRoute(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(LAST_ROUTE_KEY)
}
