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
  "audit-log": "/admin/audit",
}

const PATH_TO_SCREEN: Record<string, string> = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen])
)

export function pathForScreen(
  screen: string,
  locationId?: string | null
): string {
  if (screen === "location-detail") {
    return locationId ? `/location/${locationId}` : "/home"
  }
  if (screen === "join-queue-confirmation") {
    return locationId ? `/location/${locationId}/join` : "/home"
  }
  return SCREEN_PATHS[screen] ?? "/"
}

export function screenFromPath(pathname: string): string {
  if (pathname.startsWith("/location/") && pathname.endsWith("/join")) {
    return "join-queue-confirmation"
  }
  if (pathname.startsWith("/location/")) {
    return "location-detail"
  }
  return PATH_TO_SCREEN[pathname] ?? "splash"
}

export function locationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/location\/([^/]+)/)
  return match?.[1] ?? null
}

export const PUBLIC_PATH_PREFIXES = [
  "/",
  "/onboarding",
  "/login",
  "/register",
  "/forgot-password",
  "/auth",
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
  if (isPublicPath(pathname)) return null

  if (pathname.startsWith("/admin")) {
    if (role !== "admin") return role ? homePathForRole(role) : "/login"
    return null
  }

  if (pathname.startsWith("/staff")) {
    if (role !== "staff") return role ? homePathForRole(role) : "/login"
    return null
  }

  // User app surfaces — staff/admin are sent to their dashboards
  const userApp =
    pathname.startsWith("/home") ||
    pathname.startsWith("/map") ||
    pathname.startsWith("/location") ||
    pathname.startsWith("/queue") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/rate")

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
  return window.sessionStorage.getItem(LAST_ROUTE_KEY)
}

export function writeLastRoute(pathname: string): void {
  if (typeof window === "undefined") return
  if (!shouldPersistPath(pathname)) return
  window.sessionStorage.setItem(LAST_ROUTE_KEY, pathname)
}

export function clearLastRoute(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(LAST_ROUTE_KEY)
}
