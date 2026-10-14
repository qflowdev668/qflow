"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  googleOAuthSignInOptions,
  oauthCallbackRedirectUrl,
} from "@/lib/auth-redirect"
import { unlockPrivateAccess } from "@/lib/private-access"
import {
  STAFF_QUEUE_POLL_MS,
  STAFF_QUEUE_REALTIME_DEBOUNCE_MS,
  createDebouncedRunner,
  parseStaffQueueResponse,
  sortStaffQueueEntries,
  type StaffQueueSyncStatus,
} from "@/lib/staff-queue-pipe"
import { createClient } from "@/lib/supabase/client"
import {
  languageOptions,
  queuePreviewTranslations,
  translations as fullTranslations,
  type Language,
} from "@/lib/i18n"
import {
  PRE_AUTH_SCREENS,
  isSupabaseConfigured,
  mapDbLocation,
  mapDbQueueEntry,
  screenAllowedForRole,
  screenForRole,
} from "@/lib/supabase/helpers"
import {
  clearLastRoute,
  isPublicPath,
  pathAllowedForRole,
  pathForScreen,
  readLastRoute,
  screenFromPath,
} from "@/lib/routes"
import {
  applyAccessibilityDom,
  DEFAULT_ACCESSIBILITY,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
} from "@/lib/accessibility-prefs"
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPreferences,
  parseNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-prefs"
import { validateStrongPassword } from "@/lib/password"
import { dispatchQueuePush } from "@/lib/push-client"
import { formatSANumber } from "@/lib/sms-format"
import { notificationBody } from "@/lib/notification-templates"
import {
  fetchProfileRole,
  privilegedGoogleBlockMessage,
  privilegedGoogleLoginScreen,
  signOutIfPrivilegedGoogle,
} from "@/lib/privileged-session-guard"
import { isGoogleAuthUser } from "@/lib/auth-providers"
import { apiFetch, formatApiErrorMessage } from "@/lib/api-client"
import { onSessionExpiresInHeader } from "@/lib/session-expiry-signal"
import {
  clearAdminOtpConfirmed,
  clearOtpLoginFlow,
  clearStaffOtpConfirmed,
  isAdminOtpConfirmedInSession,
  isStaffOtpConfirmedInSession,
  markAdminOtpConfirmed,
  markStaffOtpConfirmed,
  readOtpLoginFlow,
  setOtpLoginFlow,
  type OtpLoginFlow,
} from "@/lib/privileged-login-confirmation"

const supabaseEnabled = isSupabaseConfigured()

export type UserRole = "user" | "staff" | "admin"

export type QueueStatus = "waiting" | "almost" | "your-turn" | "serving" | "served"

export type { Language }
export { languageOptions }

export type TextSize = "small" | "normal" | "large" | "x-large"
export type ButtonSize = "normal" | "large" | "x-large"

export interface AccessibilitySettings {
  textSize: TextSize
  highContrast: boolean
  simplifiedMode: boolean
  buttonSize: ButtonSize
}

/** Full UI strings for the active language. */
export const translations = fullTranslations

/** Compact queue preview used by the language selection screen. */
export const queueTranslations = queuePreviewTranslations

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  locationId?: string | null
  cellNumber?: string | null
  smsNotifications?: boolean
}

export interface Location {
  id: string
  name: string
  type: "clinic" | "bank" | "government" | "other"
  address: string
  distance: string
  queueCount: number
  waitTime: number
  capacity: number
  isOpen: boolean
  coordinates: { lat: number; lng: number }
  description?: string
}

export interface QueueEntry {
  id: string
  locationId: string
  locationName: string
  locationAddress: string
  position: number
  totalInQueue: number
  estimatedWait: number
  status: QueueStatus
  joinedAt: Date
  priorityType: PriorityType
  priorityCategory?: string
}

export interface Notification {
  id: string
  message: string
  timestamp: Date
  read: boolean
  icon: "queue" | "turn" | "feedback" | "info"
}

export interface QueueHistoryItem {
  id: string
  locationName: string
  date: Date
  status: "completed" | "cancelled" | "no-show"
}

export type PriorityType = "emergency" | "fast-track" | "standard"

/** A person waiting at the staff member's own location. */
export interface StaffQueueItem {
  id: string
  position: number
  name: string
  waitDuration: number
  isWalkIn: boolean
  priorityType: PriorityType
  priorityCategory?: string
  hasSpecialNeeds?: boolean
}

export interface ServingCustomer {
  id?: string
  ticketNumber: string
  waitTime: number
  customerName: string
  priorityType: PriorityType
  priorityCategory?: string
  isWalkIn: boolean
  next: { ticketNumber: string; waitTime: number } | null
}

export interface PendingVisitRating {
  queueEntryId: string
  locationId: string | null
  locationName: string
}

export interface ShiftSummary {
  customersServed: number
  noShows: number
  avgServiceTime: number | null
  queueRemaining: number
}

interface AppContextType {
  // Auth
  currentUser: User | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  supabaseEnabled: boolean
  authError: string | null
  clearAuthError: () => void
  login: (email?: string, password?: string, role?: UserRole) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  register: (name?: string, email?: string, password?: string, role?: UserRole) => Promise<void>
  passwordResetEmail: string | null
  startPasswordReset: (email: string) => Promise<"sent" | "unknown" | "error">
  verifyPasswordResetOtp: (
    otp: string,
    email: string,
    rt: string
  ) => Promise<boolean>
  completePasswordReset: (password: string, rt?: string | null) => Promise<void>
  emailOtpEmail: string | null
  emailOtpBackScreen: string
  startEmailOtpLogin: (email: string) => Promise<boolean>
  startAdminPhoneOtp: (phone: string) => Promise<boolean>
  startStaffLogin: (email: string, password: string) => Promise<boolean>
  resendStaffLoginOtp: (password: string) => Promise<boolean>
  verifyEmailOtpLogin: (otp: string) => Promise<void>

  // Navigation
  currentScreen: string
  navigateTo: (screen: string) => void
  selectedLocation: Location | null
  setSelectedLocation: (location: Location | null) => void
  editingLocation: Location | null
  setEditingLocation: (location: Location | null) => void

  // Queue
  activeQueue: QueueEntry | null
  joinQueue: (
    location: Location,
    priority?: { type: PriorityType; category?: string }
  ) => Promise<boolean>
  leaveQueue: () => void

  // Staff
  currentlyServing: ServingCustomer | null
  callNext: () => void
  serveWalkIn: (item: StaffQueueItem) => void
  completeService: () => void
  skipNoShow: () => void
  demoteToStandard: () => void
  isOnBreak: boolean
  toggleBreak: () => void
  locationQueue: StaffQueueItem[]
  walkIns: StaffQueueItem[]
  addWalkIn: (
    item: Omit<StaffQueueItem, "id" | "position"> & { notes?: string }
  ) => Promise<{ id: string; position: number } | { error: string }>
  staffLocationName: string | null
  shiftSummary: ShiftSummary
  refreshStaffQueue: () => Promise<boolean>
  staffQueueSyncStatus: StaffQueueSyncStatus
  staffQueueSyncError: string | null
  pendingVisitRating: PendingVisitRating | null
  refreshPendingRating: () => Promise<PendingVisitRating | null>
  submitVisitRating: (rating: number, comment: string) => Promise<boolean>
  skipVisitRating: () => void

  // Data
  locations: Location[]
  /** False until the first public locations fetch finishes. */
  locationsReady: boolean
  notifications: Notification[]
  queueHistory: QueueHistoryItem[]
  lastSyncedAt: Date | null
  refreshLocations: () => Promise<void>
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  exportMyData: () => Promise<void>
  clearQueueHistory: () => Promise<boolean>
  updateProfile: (
    updates: {
      name?: string
      cellNumber?: string | null
      smsNotifications?: boolean
      avatarUrl?: string | null
    }
  ) => Promise<boolean>

  // Admin
  addLocation: (location: Omit<Location, "id">) => void
  updateLocation: (id: string, location: Partial<Location>) => void
  deleteLocation: (id: string) => void

  // Onboarding
  hasCompletedOnboarding: boolean
  completeOnboarding: () => void

  // Language
  language: Language
  setLanguage: (lang: Language) => void

  // Accessibility
  accessibility: AccessibilitySettings
  setAccessibility: (settings: AccessibilitySettings) => void

  // Alert preferences (/profile/notifications)
  notificationPreferences: NotificationPreferences
  setNotificationPreferences: (prefs: NotificationPreferences) => Promise<boolean>

  // Session (mirrors the Supabase access token, not a separate timer)
  sessionExpiresAt: Date | null
  refreshSession: () => Promise<void>
}

const minutesSince = (iso: string) =>
  Math.max(Math.round((Date.now() - new Date(iso).getTime()) / 60000), 0)

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const historyStatusFromDb = (
  status: string
): QueueHistoryItem["status"] => {
  if (status === "cancelled") return "cancelled"
  if (status === "no-show") return "no-show"
  return "completed"
}

type StaffServingApiPayload = {
  id: string
  ticketNumber: string
  waitTime: number
  customerName: string
  priorityType: PriorityType
  priorityCategory?: string
  isWalkIn: boolean
  next: { ticketNumber: string; waitTime: number } | null
}

const servingFromApi = (payload: StaffServingApiPayload): ServingCustomer => ({
  id: payload.id,
  ticketNumber: payload.ticketNumber,
  waitTime: payload.waitTime,
  customerName: payload.customerName,
  priorityType: payload.priorityType,
  priorityCategory: payload.priorityCategory,
  isWalkIn: payload.isWalkIn,
  next: payload.next,
})

const NOTIFICATION_ICONS: Notification["icon"][] = ["queue", "turn", "feedback", "info"]

function asNotificationIcon(icon: string): Notification["icon"] {
  return NOTIFICATION_ICONS.includes(icon as Notification["icon"])
    ? (icon as Notification["icon"])
    : "info"
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname() || "/"

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(supabaseEnabled)
  const [authError, setAuthError] = useState<string | null>(null)
  const [passwordResetEmail, setPasswordResetEmail] = useState<string | null>(null)
  const [emailOtpEmail, setEmailOtpEmail] = useState<string | null>(null)
  const [emailOtpBackScreen, setEmailOtpBackScreen] = useState("email-otp")
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [activeQueue, setActiveQueue] = useState<QueueEntry | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [locationsReady, setLocationsReady] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [queueHistory, setQueueHistory] = useState<QueueHistoryItem[]>([])
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  // Default false/"en" on server + first client paint to avoid hydration mismatches.
  // localStorage is applied in an effect below.
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [currentlyServing, setCurrentlyServing] = useState<ServingCustomer | null>(null)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [locationQueue, setLocationQueue] = useState<StaffQueueItem[]>([])
  const [pendingVisitRating, setPendingVisitRating] = useState<PendingVisitRating | null>(null)
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary>({
    customersServed: 0,
    noShows: 0,
    avgServiceTime: null,
    queueRemaining: 0,
  })
  const [staffQueueSyncStatus, setStaffQueueSyncStatus] =
    useState<StaffQueueSyncStatus>("idle")
  const [staffQueueSyncError, setStaffQueueSyncError] = useState<string | null>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [language, setLanguageState] = useState<Language>("en")
  const [accessibility, setAccessibilityState] =
    useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY)
  const [notificationPreferences, setNotificationPreferencesState] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS)

  // Demo preview users have no Supabase session, so data writes are skipped for them
  const isDemoUser = useRef(false)
  // Staff/admin may only stay signed in after their dedicated OTP flow.
  // Refresh of an existing session is allowed.
  const staffOtpConfirmed = useRef(false)
  const adminOtpConfirmed = useRef(false)
  const emailOtpVerifyInFlight = useRef(false)
  const privilegedLoginInProgress = useRef(false)
  const staffQueueInFlight = useRef(false)
  const currentUserRef = useRef<User | null>(null)
  const pathnameRef = useRef(pathname)

  const confirmStaffOtp = () => {
    staffOtpConfirmed.current = true
    markStaffOtpConfirmed()
  }

  const revokeStaffOtp = () => {
    staffOtpConfirmed.current = false
    clearStaffOtpConfirmed()
  }

  const staffOtpIsConfirmed = () => {
    if (staffOtpConfirmed.current) return true
    if (isStaffOtpConfirmedInSession()) {
      staffOtpConfirmed.current = true
      return true
    }
    return false
  }

  const confirmAdminOtp = () => {
    adminOtpConfirmed.current = true
    markAdminOtpConfirmed()
  }

  const revokeAdminOtp = () => {
    adminOtpConfirmed.current = false
    clearAdminOtpConfirmed()
  }

  const adminOtpIsConfirmed = () => {
    if (adminOtpConfirmed.current) return true
    if (isAdminOtpConfirmedInSession()) {
      adminOtpConfirmed.current = true
      return true
    }
    return false
  }

  currentUserRef.current = currentUser
  pathnameRef.current = pathname
  const selectedLocationRef = useRef(selectedLocation)
  selectedLocationRef.current = selectedLocation

  const currentScreen = screenFromPath(pathname)
  const currentScreenRef = useRef(currentScreen)
  currentScreenRef.current = currentScreen
  const activeQueueRef = useRef(activeQueue)
  activeQueueRef.current = activeQueue

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const navigateTo = useCallback(
    (screen: string) => {
      const allowed = screenAllowedForRole(screen, currentUserRef.current?.role)
      let path = pathForScreen(allowed, selectedLocationRef.current?.id)
      const blocked = pathAllowedForRole(path, currentUserRef.current?.role)
      if (blocked) path = blocked
      router.push(path)
    },
    [router]
  )

  const setSelectedLocation = useCallback((location: Location | null) => {
    selectedLocationRef.current = location
    setSelectedLocationState(location)
  }, [])

  const goToRoleHome = useCallback(
    (role: UserRole, force = false) => {
      // Recovery / reset routes own navigation via ?rt= — do not bounce to role home.
      if (typeof window !== "undefined") {
        const path = window.location.pathname
        if (path.startsWith("/forgot-password")) return

        // After session_expired → re-login, restore the page the user was on
        // when the API rejected the expired JWT (role-checked).
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl")
        if (
          returnUrl &&
          returnUrl.startsWith("/") &&
          !returnUrl.startsWith("//")
        ) {
          const destPath = returnUrl.split("?")[0] || "/"
          if (!pathAllowedForRole(destPath, role)) {
            startTransition(() => {
              router.push(returnUrl)
            })
            return
          }
        }
      }
      const onPreAuth =
        force ||
        PRE_AUTH_SCREENS.includes(screenFromPath(pathnameRef.current))
      if (onPreAuth) {
        navigateTo(screenForRole(role))
      }
    },
    [navigateTo, router]
  )

  const loadLocations = useCallback(async () => {
    try {
      if (!supabase) return
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name")

      if (!error && data) {
        setLocations(data.map(mapDbLocation))
        setLastSyncedAt(new Date())
      }
    } finally {
      setLocationsReady(true)
    }
  }, [supabase])

  const loadProfile = useCallback(
    async (userId: string, fallbackEmail: string, fallbackName?: string) => {
      if (!supabase) return null

      let { data } = await supabase
        .from("profiles")
        .select(
          "id, name, email, role, location_id, avatar_url, language, cell_number, sms_notifications, notification_preferences"
        )
        .eq("id", userId)
        .maybeSingle()

      // Column may not exist until migration 20260923210000 is applied.
      if (!data) {
        const fallback = await supabase
          .from("profiles")
          .select(
            "id, name, email, role, location_id, avatar_url, language, cell_number, sms_notifications"
          )
          .eq("id", userId)
          .maybeSingle()
        data = fallback.data as typeof data
      }

      const profile: User = {
        id: userId,
        name: data?.name || fallbackName || fallbackEmail.split("@")[0],
        email: data?.email || fallbackEmail,
        role: (data?.role as UserRole) ?? "user",
        avatar: data?.avatar_url ?? undefined,
        locationId: data?.location_id ?? null,
        cellNumber: data?.cell_number ?? null,
        smsNotifications: data?.sms_notifications === true,
      }

      const prefsRaw =
        data && "notification_preferences" in data
          ? (data as { notification_preferences?: unknown }).notification_preferences
          : undefined
      if (prefsRaw) {
        const prefs = parseNotificationPreferences(prefsRaw)
        setNotificationPreferencesState(prefs)
        saveNotificationPreferences(prefs)
      }

      if (data?.language) {
        const lang = data.language as Language
        setLanguageState(lang)
        if (typeof window !== "undefined") {
          window.localStorage.setItem("qflow_language", lang)
        }
      }

      setCurrentUser(profile)
      return profile
    },
    [supabase]
  )

  // userId is passed explicitly: RLS lets staff/admin read other people's rows, so
  // filtering has to happen in the query rather than relying on the policy.
  const loadActiveQueue = useCallback(async (userId: string) => {
    if (!supabase) return null

    const { data } = await supabase
      .from("queue_entries")
      .select("*, locations(name, address, queue_count)")
      .eq("user_id", userId)
      .in("status", ["waiting", "almost", "your-turn", "serving"])
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) {
      activeQueueRef.current = null
      setActiveQueue(null)
      return null
    }

    const loc = data.locations as unknown as {
      name: string
      address: string
      queue_count: number
    } | null

    const mapped = mapDbQueueEntry(
      data,
      { name: loc?.name ?? "Location", address: loc?.address ?? "" },
      loc?.queue_count ?? data.position
    )
    activeQueueRef.current = mapped
    setActiveQueue(mapped)
    return mapped
  }, [supabase])

  const loadNotifications = useCallback(async (userId: string) => {
    if (!supabase) return

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setNotifications(
        data.map((n) => ({
          id: n.id,
          message: n.message,
          timestamp: new Date(n.created_at),
          read: n.read,
          icon: asNotificationIcon(n.icon),
        }))
      )
    }
  }, [supabase])

  const loadPendingRating = useCallback(async (userId: string) => {
    if (!supabase) return null

    const { findRateableVisit } = await import("@/lib/visit-rating")
    const visit = await findRateableVisit(supabase, userId)
    if (!visit) {
      setPendingVisitRating(null)
      return null
    }

    const pending: PendingVisitRating = {
      queueEntryId: visit.queueEntryId,
      locationId: visit.locationId,
      locationName: visit.locationName,
    }
    setPendingVisitRating(pending)
    return pending
  }, [supabase])

  const loadHistory = useCallback(async (userId: string) => {
    if (!supabase) return

    const { data } = await supabase
      .from("queue_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setQueueHistory(
        data.map((h) => ({
          id: h.id,
          locationName: h.location_name,
          date: new Date(h.created_at),
          status: historyStatusFromDb(h.status),
        }))
      )
    }
  }, [supabase])

  // Staff view of their assigned location (FastAPI service-role list + pipe).
  const refreshStaffQueue = useCallback(async (): Promise<boolean> => {
    if (!currentUser?.locationId || isDemoUser.current) {
      setLocationQueue([])
      setShiftSummary({
        customersServed: 0,
        noShows: 0,
        avgServiceTime: null,
        queueRemaining: 0,
      })
      setStaffQueueSyncStatus("idle")
      setStaffQueueSyncError(
        currentUser?.role === "staff" || currentUser?.role === "admin"
          ? "No location assigned to this staff account. Ask an admin to assign a clinic."
          : null
      )
      return false
    }

    // Avoid stacking polls while a prior /api/staff/queue is still in flight
    // (was ~10s/request with a 3s poll → perpetual "syncing").
    if (staffQueueInFlight.current) return false
    staffQueueInFlight.current = true

    setStaffQueueSyncStatus((prev) => (prev === "live" ? "live" : "syncing"))
    try {
      let res: Response | null = null
      let raw: unknown = {}
      // One retry — Render free tier / Cloudflare often returns a transient 502.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await apiFetch("/api/staff/queue", { cache: "no-store" })
          raw = await res.json().catch(() => ({}))
          if (res.ok || (res.status !== 502 && res.status < 500)) break
        } catch (err) {
          if (attempt === 1) throw err
          raw = {}
          res = null
        }
        await new Promise((r) => setTimeout(r, 800))
      }
      if (!res) {
        setStaffQueueSyncStatus("error")
        setStaffQueueSyncError("Could not reach the server for the staff queue.")
        return false
      }
      const parsed = parseStaffQueueResponse(res.status, raw)
      if (!parsed.ok) {
        console.error("STAFF QUEUE PIPE FAILED:", {
          status: parsed.status,
          message: parsed.message,
          body: raw,
        })
        setStaffQueueSyncStatus("error")
        setStaffQueueSyncError(parsed.message)
        return false
      }

      const data = parsed.payload as {
        entries?: StaffQueueItem[]
        summary?: ShiftSummary
        currentlyServing?: StaffServingApiPayload | null
        locationId?: string | null
      }

      if (
        data.locationId &&
        currentUser.locationId &&
        data.locationId !== currentUser.locationId
      ) {
        setStaffQueueSyncStatus("error")
        setStaffQueueSyncError(
          "Staff location mismatch between profile and queue API. Re-assign the staff clinic."
        )
        return false
      }

      if (Array.isArray(data.entries)) {
        setLocationQueue(sortStaffQueueEntries(data.entries))
      }
      if (data.summary) setShiftSummary(data.summary)
      if ("currentlyServing" in data) {
        setCurrentlyServing(
          data.currentlyServing ? servingFromApi(data.currentlyServing) : null
        )
      }
      setLastSyncedAt(new Date())
      setStaffQueueSyncStatus("live")
      setStaffQueueSyncError(null)
      return true
    } catch (err) {
      console.error("STAFF QUEUE PIPE FAILED:", err)
      setStaffQueueSyncStatus("error")
      setStaffQueueSyncError("Could not reach the server for the staff queue.")
      return false
    } finally {
      staffQueueInFlight.current = false
    }
  }, [currentUser])

  const loadLocationQueue = useCallback(
    async (_locationId: string) => {
      await refreshStaffQueue()
    },
    [refreshStaffQueue]
  )

  const loadShiftSummary = useCallback(
    async (_locationId: string) => {
      await refreshStaffQueue()
    },
    [refreshStaffQueue]
  )

  const loadUserData = useCallback(
    async (userId: string) => {
      await Promise.all([
        loadActiveQueue(userId),
        loadNotifications(userId),
        loadHistory(userId),
        loadPendingRating(userId),
      ])
    },
    [loadActiveQueue, loadNotifications, loadHistory, loadPendingRating]
  )

  const recordAudit = useCallback(
    async (action: string, detail?: string) => {
      if (!supabase || !currentUser || isDemoUser.current) return
      await supabase.from("audit_log").insert({
        actor_id: currentUser.id,
        actor_name: currentUser.name,
        action,
        detail: detail ?? null,
      })
    },
    [supabase, currentUser]
  )

  // Locations are public, so load them regardless of auth state
  useEffect(() => {
    void loadLocations()
  }, [loadLocations])

  // Restore tab-scoped OTP flags before auth listeners run (avoids post-login sign-out races).
  useEffect(() => {
    if (isStaffOtpConfirmedInSession()) staffOtpConfirmed.current = true
    if (isAdminOtpConfirmedInSession()) adminOtpConfirmed.current = true
  }, [])

  // Apply persisted prefs after mount so SSR HTML matches the first client render.
  useEffect(() => {
    const savedLang = window.localStorage.getItem("qflow_language")
    const allowed: Language[] = ["en", "af", "zu", "st", "xh", "tn"]
    if (allowed.includes(savedLang as Language)) {
      setLanguageState(savedLang as Language)
    }
    if (window.localStorage.getItem("qflow_onboarding_done") === "1") {
      setHasCompletedOnboarding(true)
    }
    const a11y = loadAccessibilitySettings()
    setAccessibilityState(a11y)
    applyAccessibilityDom(a11y)
    setNotificationPreferencesState(loadNotificationPreferences())
  }, [])

  const setAccessibility = useCallback((settings: AccessibilitySettings) => {
    setAccessibilityState(settings)
    saveAccessibilitySettings(settings)
    applyAccessibilityDom(settings)
  }, [])

  const setNotificationPreferences = useCallback(
    async (prefs: NotificationPreferences): Promise<boolean> => {
      setNotificationPreferencesState(prefs)
      saveNotificationPreferences(prefs)
      if (!supabase || !currentUser || isDemoUser.current) return true
      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: prefs })
        .eq("id", currentUser.id)
      // Local persist always wins; cloud sync may fail until migration is applied.
      if (error) {
        console.warn("[qflow] notification_preferences sync:", error.message)
      }
      return true
    },
    [supabase, currentUser]
  )

  // Show a callback error on a login screen once, then drop it from the URL.
  // A session means the code exchange already worked, so the message is stale.
  // Password sign-in does not read this query.
  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    const err = url.searchParams.get("auth_error")
    if (!err) return
    url.searchParams.delete("auth_error")
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    const path = url.pathname.replace(/\/$/, "") || "/"
    const onLogin = path === "/login" || path.startsWith("/login/")
    if (!onLogin) {
      setAuthError(null)
      return
    }
    let cancelled = false
    void (async () => {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null
      if (cancelled) return
      if (session) {
        setAuthError(null)
        return
      }
      setAuthError(err)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // If Supabase falls back to Site URL with ?code= on a non-callback path, forward it.
  // Email/password sign-in never puts a code in the URL and does not use this.
  useEffect(() => {
    if (typeof window === "undefined") return
    const path = window.location.pathname.replace(/\/$/, "") || "/"
    if (path === "/auth/callback") return
    const params = new URLSearchParams(window.location.search)
    if (!params.get("code") && !params.get("error_description")) return
    const qs = window.location.search
    window.location.replace(`/auth/callback/${qs}`)
  }, [])

  // Track the Supabase session
  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false)
      return
    }

    let cancelled = false

    const rejectFreshPrivilegedSignIn = async (
      authUser: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>,
      profile: User
    ) => {
      if (privilegedLoginInProgress.current) return false

      if (profile.role === "staff" && staffOtpIsConfirmed()) return false
      if (profile.role === "admin" && adminOtpIsConfirmed()) return false

      // Email/password staff who just finished OTP may race ahead of the
      // sessionStorage flag on a delayed SIGNED_IN. Never reject email-provider
      // staff while the staff OTP flow marker is still set for this tab.
      if (
        profile.role === "staff" &&
        readOtpLoginFlow() === "staff-login" &&
        !isGoogleAuthUser(authUser)
      ) {
        confirmStaffOtp()
        return false
      }

      if (
        await signOutIfPrivilegedGoogle(supabase, authUser, profile.role, {
          respectOtpBypass: true,
        })
      ) {
        setCurrentUser(null)
        setAuthError(privilegedGoogleBlockMessage(profile.role as "staff" | "admin"))
        navigateTo(privilegedGoogleLoginScreen(profile.role as "staff" | "admin"))
        return true
      }

      if (profile.role === "staff" && !staffOtpIsConfirmed()) {
        await supabase.auth.signOut()
        setCurrentUser(null)
        setAuthError(
          "Staff must sign in with email and password, then enter the code sent to your email."
        )
        unlockPrivateAccess("staff")
        navigateTo("staff-login")
        return true
      }
      if (profile.role === "admin" && !adminOtpIsConfirmed()) {
        await supabase.auth.signOut()
        setCurrentUser(null)
        setAuthError("Admins must sign in with cellphone number, then the email code.")
        unlockPrivateAccess("admin")
        navigateTo("admin-phone-otp")
        return true
      }
      return false
    }

    const sync = async () => {
      const onResetRoute =
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/forgot-password")

      const { data } = await supabase.auth.getUser()
      if (cancelled) return

      if (data.user) {
        if (onResetRoute) {
          if (data.user.email) {
            setPasswordResetEmail(data.user.email.toLowerCase())
          }
          if (!cancelled) setIsAuthLoading(false)
          return
        }

        const role = await fetchProfileRole(supabase, data.user.id)
        if (
          !cancelled &&
          (await signOutIfPrivilegedGoogle(supabase, data.user, role, {
            respectOtpBypass: true,
          }))
        ) {
          setCurrentUser(null)
          if (role === "staff" || role === "admin") {
            setAuthError(privilegedGoogleBlockMessage(role))
            navigateTo(privilegedGoogleLoginScreen(role))
          }
          if (!cancelled) setIsAuthLoading(false)
          return
        }

        const profile = await loadProfile(
          data.user.id,
          data.user.email ?? "",
          (data.user.user_metadata?.name as string) ||
            (data.user.user_metadata?.full_name as string)
        )
        if (!cancelled && profile) {
          isDemoUser.current = false
          if (profile.role === "staff") confirmStaffOtp()
          if (profile.role === "admin") confirmAdminOtp()
          setAuthError(null)
          await loadUserData(data.user.id)
          goToRoleHome(profile.role)
        }
      }

      if (!cancelled) setIsAuthLoading(false)
    }

    void sync()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          const email = session?.user?.email?.toLowerCase()
          if (email) setPasswordResetEmail(email)
          router.replace("/forgot-password/reset?recovery=1")
          return
        }

        if (event === "SIGNED_OUT") {
          // Supabase can emit a transient SIGNED_OUT during verifyOtp / token
          // swap. Clearing the user and navigating immediately bounces staff
          // off /staff ~1–2s after a successful OTP login. Wait, then confirm
          // the session is actually gone.
          const signedOutDuringPrivilegedLogin = privilegedLoginInProgress.current
          window.setTimeout(() => {
            if (cancelled) return
            void supabase.auth.getSession().then(({ data: sessionData }) => {
              if (cancelled) return
              if (sessionData.session) {
                // Transient — session already restored.
                return
              }
              if (
                privilegedLoginInProgress.current ||
                signedOutDuringPrivilegedLogin
              ) {
                // Still inside staff/admin OTP verify — ignore this SIGNED_OUT.
                return
              }
              revokeStaffOtp()
              revokeAdminOtp()
              clearOtpLoginFlow()
              setCurrentUser(null)
              setActiveQueue(null)
              setNotifications([])
              setQueueHistory([])
              setSessionExpiresAt(null)
              const onReset =
                typeof window !== "undefined" &&
                window.location.pathname.startsWith("/forgot-password")
              if (!isDemoUser.current && !onReset) {
                if (
                  !PRE_AUTH_SCREENS.includes(screenFromPath(pathnameRef.current))
                ) {
                  navigateTo("login")
                }
              }
            })
          }, 300)
          return
        }

        // Defer async work — calling Supabase/DB inside the callback can race
        // and drop the fresh email-OTP session.
        if (
          session?.user &&
          (event === "SIGNED_IN" || event === "INITIAL_SESSION")
        ) {
          const user = session.user
          const shouldAudit = event === "SIGNED_IN"
          const isFreshSignIn = event === "SIGNED_IN"
          window.setTimeout(() => {
            if (cancelled) return
            const onReset =
              typeof window !== "undefined" &&
              window.location.pathname.startsWith("/forgot-password")
            if (onReset) {
              if (user.email) setPasswordResetEmail(user.email.toLowerCase())
              return
            }
            isDemoUser.current = false
            void (async () => {
              if (privilegedLoginInProgress.current) return

              const role = await fetchProfileRole(supabase, user.id)
              if (
                await signOutIfPrivilegedGoogle(supabase, user, role, {
                  respectOtpBypass: true,
                })
              ) {
                setCurrentUser(null)
                if (role === "staff" || role === "admin") {
                  setAuthError(privilegedGoogleBlockMessage(role))
                  navigateTo(privilegedGoogleLoginScreen(role))
                }
                return
              }

              const profile = await loadProfile(
                user.id,
                user.email ?? "",
                (user.user_metadata?.name as string) ||
                  (user.user_metadata?.full_name as string)
              )
              if (cancelled || !profile) return
              if (isFreshSignIn && (await rejectFreshPrivilegedSignIn(user, profile))) return
              setAuthError(null)
              if (profile.role === "staff") confirmStaffOtp()
              if (profile.role === "admin") confirmAdminOtp()
              await loadUserData(user.id)
              if (cancelled) return
              if (shouldAudit && profile.role === "admin") {
                await supabase.from("audit_log").insert({
                  actor_id: profile.id,
                  actor_name: profile.name,
                  action: "Admin Login",
                  detail: profile.email,
                })
              }
              goToRoleHome(profile.role)
            })()
          }, 0)
        }
      }
    )

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [supabase, loadProfile, loadUserData, goToRoleHome, navigateTo, router])

  // Client route guard (static export has no Edge proxy): after auth resolves,
  // bounce anonymous users off protected paths and enforce role homes.
  useEffect(() => {
    if (isAuthLoading) return
    if (typeof window === "undefined") return

    const path = pathname.split("?")[0] || "/"
    if (isPublicPath(path)) return

    if (!currentUser) {
      const returnUrl = `${window.location.pathname}${window.location.search}`
      const params = new URLSearchParams()
      if (returnUrl && returnUrl !== "/login" && !returnUrl.startsWith("/login?")) {
        params.set("returnUrl", returnUrl)
      }
      const qs = params.toString()
      startTransition(() => {
        router.replace(qs ? `/login?${qs}` : "/login")
      })
      return
    }

    const blocked = pathAllowedForRole(path, currentUser.role)
    if (blocked) {
      startTransition(() => {
        router.replace(blocked)
      })
    }
  }, [isAuthLoading, currentUser, pathname, router])

  // Realtime: queue movements, location busyness, and new notifications
  useEffect(() => {
    if (!supabase || !currentUser || isDemoUser.current) return

    const userId = currentUser.id

    const channel = supabase
      .channel("qflow-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => {
          void (async () => {
            const previousId = activeQueueRef.current?.id
            const stillInLine = await loadActiveQueue(userId)
            const pending = await loadPendingRating(userId)
            await loadHistory(userId)
            if (
              previousId &&
              !stillInLine &&
              pending &&
              currentScreenRef.current === "my-queue"
            ) {
              navigateTo("rate-experience")
            }
          })()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => {
          void loadLocations()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadNotifications(userId)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, currentUser, loadActiveQueue, loadLocations, loadNotifications, loadPendingRating, loadHistory])

  // Staff queue pipe: Realtime hint + polling fallback so customer joins always surface.
  const staffLocationId = currentUser?.locationId ?? null

  useEffect(() => {
    if (!supabase || !staffLocationId || isDemoUser.current) {
      setLocationQueue([])
      return
    }

    let cancelled = false
    const debounced = createDebouncedRunner(STAFF_QUEUE_REALTIME_DEBOUNCE_MS)

    const pull = () => {
      if (!cancelled) void refreshStaffQueue()
    }

    pull()

    const pollId = window.setInterval(pull, STAFF_QUEUE_POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === "visible") pull()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", pull)

    const channel = supabase
      .channel(`qflow-location-${staffLocationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `location_id=eq.${staffLocationId}`,
        },
        () => {
          debounced.run(pull)
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          pull()
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("STAFF QUEUE REALTIME:", status, "— polling remains active")
          pull()
        }
      })

    return () => {
      cancelled = true
      debounced.cancel()
      window.clearInterval(pollId)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", pull)
      void supabase.removeChannel(channel)
    }
  }, [supabase, staffLocationId, refreshStaffQueue])

  // Mirror the real access-token lifetime so the session banner is truthful
  useEffect(() => {
    if (!supabase) return

    const read = async () => {
      const { data } = await supabase.auth.getSession()
      setSessionExpiresAt(
        data.session?.expires_at ? new Date(data.session.expires_at * 1000) : null
      )
    }

    void read()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessionExpiresAt(
          session?.expires_at ? new Date(session.expires_at * 1000) : null
        )
      }
    )

    return () => subscription.subscription.unsubscribe()
  }, [supabase])

  // FastAPI ``X-Session-Expires-In`` (set on Bearer responses) keeps the banner
  // aligned with the JWT the API actually accepted — no Edge proxy.ts.
  useEffect(() => {
    onSessionExpiresInHeader((expiresInSeconds) => {
      setSessionExpiresAt(new Date(Date.now() + expiresInSeconds * 1000))
    })
    return () => onSessionExpiresInHeader(null)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.auth.refreshSession()
    setSessionExpiresAt(
      data.session?.expires_at ? new Date(data.session.expires_at * 1000) : null
    )
  }, [supabase])

  const login = useCallback(
    async (email?: string, password?: string) => {
      clearAuthError()
      if (!supabase) {
        setAuthError("Supabase is not configured. Add your project keys to .env.local.")
        return
      }
      if (!email || !password) {
        setAuthError("Enter your email and password to sign in.")
        return
      }

      const normalized = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      })
      if (error) {
        setAuthError(error.message)
        return
      }

      const user = data.user
      if (!user) return

      const profile = await loadProfile(
        user.id,
        user.email ?? normalized,
        (user.user_metadata?.name as string) ||
          (user.user_metadata?.full_name as string)
      )

      if (profile?.role === "staff") {
        await supabase.auth.signOut()
        setCurrentUser(null)
        setAuthError(
          "Staff accounts must use Staff sign in (email, password, then email code)."
        )
        navigateTo("staff-login")
        return
      }

      if (profile?.role === "admin") {
        await supabase.auth.signOut()
        setCurrentUser(null)
        setAuthError("Admins must sign in with cellphone number, then the email code.")
        navigateTo("admin-phone-otp")
      }
      // user sessions continue via onAuthStateChange
    },
    [supabase, clearAuthError, loadProfile]
  )

  const loginWithGoogle = useCallback(async () => {
    clearAuthError()
    if (!supabase) {
      setAuthError("Supabase is not configured. Add your project keys to .env.local.")
      return
    }

    const { error } = await supabase.auth.signInWithOAuth(googleOAuthSignInOptions())

    if (error) setAuthError(error.message)
  }, [supabase, clearAuthError])

  const register = useCallback(
    async (name?: string, email?: string, password?: string, _role: UserRole = "user") => {
      clearAuthError()
      if (!supabase) {
        setAuthError("Supabase is not configured. Add your project keys to .env.local.")
        return
      }
      if (!email || !password) {
        setAuthError("Enter an email and password to create your account.")
        return
      }

      const strengthError = validateStrongPassword(password)
      if (strengthError) {
        setAuthError(strengthError)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Role is never set from the client — public sign-up is always "user".
          data: { name: name || email.split("@")[0] },
          emailRedirectTo: oauthCallbackRedirectUrl(),
        },
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      if (!data.session) {
        setAuthError("Check your email to confirm your account, then sign in.")
        navigateTo("login")
      }
    },
    [supabase, clearAuthError]
  )

  const logout = useCallback(async () => {
    setActiveQueue(null)
    setCurrentlyServing(null)
    setCurrentUser(null)
    setNotifications([])
    setQueueHistory([])
    setLocationQueue([])
    setPendingVisitRating(null)
    setSelectedLocation(null)
    setEditingLocation(null)
    revokeStaffOtp()
    revokeAdminOtp()
    clearOtpLoginFlow()

    if (supabase && !isDemoUser.current) {
      await supabase.auth.signOut()
    }

    isDemoUser.current = false
    clearLastRoute()
    navigateTo("login")
  }, [supabase, navigateTo])

  // Password reset: server token in ?rt= + Supabase recovery session cookies.
  const startPasswordReset = useCallback(
    async (email: string): Promise<"sent" | "unknown" | "error"> => {
      clearAuthError()
      const normalized = email.trim().toLowerCase()
      try {
        const res = await apiFetch("/api/auth/reset/send", {
          public: true,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalized }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          resetToken?: string
        }
        if (!res.ok) {
          setAuthError(data.error || "Could not send a password reset code.")
          return "error"
        }
        setPasswordResetEmail(normalized)
        if (data.resetToken) {
          router.push(
            `/forgot-password/verify?rt=${encodeURIComponent(data.resetToken)}`
          )
        } else {
          navigateTo("verify-otp")
        }
        return "sent"
      } catch {
        setAuthError("Could not reach the server to send a password reset code.")
        return "error"
      }
    },
    [clearAuthError, navigateTo, router]
  )

  const verifyPasswordResetOtp = useCallback(
    async (otp: string, email: string, rt: string) => {
      clearAuthError()
      if (!supabase || !email || !rt) {
        navigateTo("forgot-password")
        return false
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "recovery",
      })
      if (error) {
        setAuthError(error.message || "Invalid reset code.")
        return false
      }

      const advance = await apiFetch("/api/auth/reset/advance", {
        public: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rt, action: "verify" }),
      })
      if (!advance.ok) {
        const data = (await advance.json().catch(() => ({}))) as { error?: string }
        setAuthError(data.error || "Could not continue password reset.")
        return false
      }

      setPasswordResetEmail(email.toLowerCase())
      router.replace(`/forgot-password/reset?rt=${encodeURIComponent(rt)}`)
      return true
    },
    [supabase, clearAuthError, navigateTo, router]
  )

  const completePasswordReset = useCallback(
    async (password: string, rt?: string | null) => {
      clearAuthError()
      if (!supabase) return

      const strengthError = validateStrongPassword(password)
      if (strengthError) {
        setAuthError(strengthError)
        return
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setAuthError(error.message)
        return
      }

      if (rt) {
        void apiFetch("/api/auth/reset/advance", {
          public: true,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rt, action: "consume" }),
        })
      }

      setPasswordResetEmail(null)
      await supabase.auth.signOut()
      setCurrentUser(null)
      navigateTo("login")
    },
    [supabase, clearAuthError, navigateTo]
  )

  const startEmailOtpLogin = useCallback(
    async (email: string): Promise<boolean> => {
      clearAuthError()
      if (!supabase) {
        setAuthError("Supabase is not configured. Add your project keys to .env.local.")
        return false
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: oauthCallbackRedirectUrl(),
        },
      })
      if (error) {
        setAuthError(error.message)
        return false
      }

      setEmailOtpEmail(email.trim().toLowerCase())
      setEmailOtpBackScreen("email-otp")
      navigateTo("login-otp-verify")
      return true
    },
    [supabase, clearAuthError]
  )

  const startAdminPhoneOtp = useCallback(
    async (phone: string): Promise<boolean> => {
      clearAuthError()
      try {
        const res = await apiFetch("/api/admin/otp/send", {
          public: true,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          email?: string
        }
        if (!res.ok) {
          setAuthError(formatApiErrorMessage(data, "Could not send admin login code."))
          return false
        }
        setEmailOtpEmail(null)
        setEmailOtpBackScreen("admin-phone-otp")
        setOtpLoginFlow("admin-phone-otp")
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("qflow_admin_otp_phone", phone)
        }
        navigateTo("login-otp-verify")
        return true
      } catch {
        setAuthError("Could not reach the server to send the admin login code.")
        return false
      }
    },
    [clearAuthError]
  )

  const startStaffLogin = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      clearAuthError()
      const normalized = email.trim().toLowerCase()
      try {
        const res = await apiFetch("/api/staff/login", {
          public: true,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalized, password }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          email?: string
        }
        if (!res.ok) {
          const message = formatApiErrorMessage(data, "Could not start staff sign-in.")
          setAuthError(
            message === "Could not start staff sign-in."
              ? "Could not start staff sign-in. Check the exact email from Admin → Staff and the temporary password."
              : message
          )
          return false
        }
        const nextEmail = (data.email || normalized).trim().toLowerCase()
        setEmailOtpEmail(nextEmail)
        setEmailOtpBackScreen("staff-login")
        setOtpLoginFlow("staff-login")
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("qflow_staff_otp_email", nextEmail)
        }
        navigateTo("login-otp-verify")
        return true
      } catch {
        setAuthError("Could not reach the server to start staff sign-in.")
        return false
      }
    },
    [clearAuthError]
  )

  const resendStaffLoginOtp = useCallback(
    async (password: string): Promise<boolean> => {
      clearAuthError()
      const email =
        emailOtpEmail ||
        (typeof window !== "undefined"
          ? window.sessionStorage.getItem("qflow_staff_otp_email")
          : null)

      if (!email) {
        setAuthError("Enter your staff email and password again.")
        navigateTo("staff-login")
        return false
      }

      if (!password) {
        setAuthError("Enter your password to send a new code.")
        return false
      }

      try {
        const res = await apiFetch("/api/staff/login", {
          public: true,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, resendOnly: true }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setAuthError(data.error || "Could not resend the login code.")
          return false
        }
        setEmailOtpEmail(email)
        setEmailOtpBackScreen("staff-login")
        setOtpLoginFlow("staff-login")
        return true
      } catch {
        setAuthError("Could not reach the server to resend the login code.")
        return false
      }
    },
    [clearAuthError, emailOtpEmail]
  )

  const verifyEmailOtpLogin = useCallback(
    async (otp: string) => {
      if (emailOtpVerifyInFlight.current) return
      emailOtpVerifyInFlight.current = true
      privilegedLoginInProgress.current = true

      clearAuthError()
      const storedFlow = readOtpLoginFlow()
      const staffEmailHint =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("qflow_staff_otp_email")
          : null
      // Prefer explicit staff/admin UI state, then tab-scoped flow, then staff email hint
      // (console / deep-link recovery on /login/otp without going through staff-login).
      const activeFlow: OtpLoginFlow =
        emailOtpBackScreen === "staff-login" || emailOtpBackScreen === "admin-phone-otp"
          ? emailOtpBackScreen
          : storedFlow === "staff-login" || storedFlow === "admin-phone-otp"
            ? storedFlow
            : staffEmailHint
              ? "staff-login"
              : storedFlow ?? "email-otp"
      const isStaffFlow = activeFlow === "staff-login"
      const isAdminFlow = activeFlow === "admin-phone-otp"

      try {
        if (!supabase) {
          navigateTo(activeFlow === "email-otp" ? "email-otp" : activeFlow)
          return
        }

        if (isAdminFlow) {
          const phone =
            typeof window !== "undefined"
              ? window.sessionStorage.getItem("qflow_admin_otp_phone") || ""
              : ""
          if (!phone) {
            setAuthError("Enter the admin cellphone number again.")
            navigateTo("admin-phone-otp")
            return
          }

          confirmAdminOtp()
          setOtpLoginFlow("admin-phone-otp")
          try {
            const res = await apiFetch("/api/admin/otp/verify", {
              public: true,
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone, token: otp }),
            })
            const data = (await res.json().catch(() => ({}))) as {
              error?: string
              session?: { access_token?: string; refresh_token?: string }
            }
            if (!res.ok) {
              revokeAdminOtp()
              setAuthError(formatApiErrorMessage(data, "Invalid login code."))
              return
            }
            if (data.session?.access_token && data.session.refresh_token) {
              await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              })
            }
          } catch {
            revokeAdminOtp()
            setAuthError("Could not verify the admin login code.")
            return
          }

          await supabase.auth.getSession()
          const { data: userData } = await supabase.auth.getUser()
          const user = userData.user
          if (!user) {
            revokeAdminOtp()
            setAuthError("Could not start an admin session. Try again.")
            return
          }

          setEmailOtpEmail(null)
          setEmailOtpBackScreen("email-otp")
          clearOtpLoginFlow()
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("qflow_admin_otp_phone")
          }

          isDemoUser.current = false
          const profile = await loadProfile(
            user.id,
            user.email ?? "",
            (user.user_metadata?.name as string) ||
              (user.user_metadata?.full_name as string)
          )
          if (!profile || profile.role !== "admin") {
            revokeAdminOtp()
            await supabase.auth.signOut()
            setCurrentUser(null)
            setAuthError("This login code is not for an admin account.")
            navigateTo("admin-phone-otp")
            return
          }

          confirmAdminOtp()
          await loadUserData(user.id)
          goToRoleHome(profile.role, true)
          return
        }

        let email = emailOtpEmail
        if (!email) {
          const staffEmail =
            typeof window !== "undefined"
              ? window.sessionStorage.getItem("qflow_staff_otp_email")
              : null
          if (isStaffFlow && staffEmail) {
            email = staffEmail
            setEmailOtpEmail(staffEmail)
          } else {
            navigateTo(activeFlow === "email-otp" ? "email-otp" : activeFlow)
            return
          }
        }

        const types = isStaffFlow
          ? (["magiclink", "email"] as const)
          : (["email"] as const)

        if (isStaffFlow) {
          confirmStaffOtp()
          setOtpLoginFlow("staff-login")
        }

        let user =
          null as
            | { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
            | null
        let sessionExpiresAtUnix: number | null = null

        let lastError: string | null = null
        for (const type of types) {
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type,
          })
          if (!error) {
            user = data.session?.user ?? data.user
            sessionExpiresAtUnix = data.session?.expires_at ?? null
            break
          }
          lastError = error.message
        }

        if (!user) {
          if (isStaffFlow) {
            const {
              data: { session },
            } = await supabase.auth.getSession()
            if (!session) revokeStaffOtp()
          }
          setAuthError(lastError || "Invalid login code.")
          return
        }

        if (sessionExpiresAtUnix) {
          setSessionExpiresAt(new Date(sessionExpiresAtUnix * 1000))
        }

        setEmailOtpEmail(null)
        setEmailOtpBackScreen("email-otp")
        // Keep staff-login flow marker briefly so a delayed SIGNED_IN cannot
        // treat this tab as an unconfirmed privileged session.
        if (isStaffFlow) {
          window.setTimeout(() => clearOtpLoginFlow(), 2500)
        } else {
          clearOtpLoginFlow()
        }
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("qflow_staff_otp_email")
        }

        isDemoUser.current = false
        const profile = await loadProfile(
          user.id,
          user.email ?? email,
          (user.user_metadata?.name as string) ||
            (user.user_metadata?.full_name as string)
        )

        if (isStaffFlow && profile && profile.role !== "staff") {
          revokeStaffOtp()
          await supabase.auth.signOut()
          setCurrentUser(null)
          setAuthError("This login code is not for a staff account.")
          unlockPrivateAccess("staff")
          navigateTo("staff-login")
          return
        }

        if (profile?.role === "admin" && !adminOtpIsConfirmed()) {
          await supabase.auth.signOut()
          setCurrentUser(null)
          setAuthError("Admins must sign in with cellphone number, then the email code.")
          unlockPrivateAccess("admin")
          navigateTo("admin-phone-otp")
          return
        }

        // Staff profiles must always mark OTP confirmed before leaving /login/otp,
        // including recovery flows that only set sessionStorage (not React state).
        if (profile?.role === "staff") confirmStaffOtp()

        await loadUserData(user.id)
        if (profile) goToRoleHome(profile.role, true)
      } finally {
        emailOtpVerifyInFlight.current = false
        // Keep the privileged gate closed long enough that delayed SIGNED_IN /
        // SIGNED_OUT events from verifyOtp cannot treat this as an unconfirmed
        // staff session and bounce /staff → /login.
        window.setTimeout(() => {
          privilegedLoginInProgress.current = false
        }, 2500)
      }
    },
    [
      supabase,
      emailOtpEmail,
      emailOtpBackScreen,
      clearAuthError,
      loadProfile,
      loadUserData,
      goToRoleHome,
    ]
  )

  const joinQueue = useCallback(
    async (
      location: Location,
      priority?: { type: PriorityType; category?: string }
    ): Promise<boolean> => {
      if (!supabase || !currentUser || isDemoUser.current) {
        setActiveQueue({
          id: Date.now().toString(),
          locationId: location.id,
          locationName: location.name,
          locationAddress: location.address,
          position: location.queueCount + 1,
          totalInQueue: location.queueCount + 1,
          estimatedWait: location.waitTime + 5,
          status: "waiting",
          joinedAt: new Date(),
          priorityType: priority?.type ?? "standard",
          priorityCategory: priority?.category,
        })
        navigateTo("my-queue")
        return true
      }

      try {
        const res = await apiFetch("/api/queue/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId: location.id,
            priority: priority?.type ?? "standard",
            priorityCategory: priority?.category ?? null,
          }),
        })
        const rawText = await res.text()
        let payload: unknown = {}
        try {
          payload = rawText ? JSON.parse(rawText) : {}
        } catch {
          payload = { detail: rawText.slice(0, 300) || undefined }
        }

        if (!res.ok) {
          console.error("JOIN QUEUE FAILED:", {
            status: res.status,
            body: payload,
            raw: rawText.slice(0, 500),
          })
          const message = formatApiErrorMessage(payload, "Could not join the queue.")
          setAuthError(message)
          return false
        }

        await Promise.all([loadActiveQueue(currentUser.id), loadLocations()])
        navigateTo("my-queue")
        return true
      } catch (err) {
        console.error("JOIN QUEUE FAILED:", err)
        setAuthError("Could not reach the server to join the queue.")
        return false
      }
    },
    [supabase, currentUser, loadActiveQueue, loadLocations, navigateTo]
  )

  const leaveQueue = useCallback(() => {
    const entry = activeQueue

    if (!supabase || !currentUser || isDemoUser.current || !entry) {
      setActiveQueue(null)
      navigateTo("home")
      return
    }

    void (async () => {
      if (entry.status === "serving" || entry.status === "your-turn") {
        setAuthError("You cannot leave the line while being served.")
        return
      }

      const { data: updated, error } = await supabase
        .from("queue_entries")
        .update({ status: "cancelled" })
        .eq("id", entry.id)
        .in("status", ["waiting", "almost"])
        .select("id")
        .maybeSingle()

      if (error) {
        setAuthError(error.message)
        return
      }

      if (!updated) {
        setAuthError("You cannot leave the line while being served.")
        await loadActiveQueue(currentUser.id)
        return
      }

      setActiveQueue(null)
      await Promise.all([loadLocations(), loadHistory(currentUser.id)])
      navigateTo("home")
    })()
  }, [supabase, currentUser, activeQueue, loadLocations, loadHistory, loadActiveQueue])

  const serveWalkIn = useCallback(
    (item: StaffQueueItem) => {
      if (!currentUser?.locationId || isDemoUser.current) {
        setAuthError("Sign in as staff assigned to a location to serve the queue.")
        return
      }

      void (async () => {
        try {
          const res = await apiFetch("/api/staff/queue/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryId: item.id }),
          })
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
            currentlyServing?: StaffServingApiPayload
          } & Partial<StaffServingApiPayload & { userId?: string | null; locationId?: string }>

          if (res.status === 409 && data.currentlyServing) {
            setCurrentlyServing(servingFromApi(data.currentlyServing))
            await refreshStaffQueue()
            navigateTo("staff-serving")
            return
          }

          if (!res.ok || !data.id || !data.ticketNumber) {
            const message =
              formatApiErrorMessage(data, "") ||
              (res.status >= 500
                ? "Server timed out while calling this customer. Tap Call again to open the serving screen if they were claimed."
                : "Could not call this customer.")
            setAuthError(message)
            await refreshStaffQueue()
            return
          }

          if (data.userId) {
            dispatchQueuePush({
              userId: data.userId,
              body: notificationBody("your_turn"),
              url: "/queue",
            })
          }

          setCurrentlyServing(
            servingFromApi({
              id: data.id,
              ticketNumber: data.ticketNumber,
              waitTime: data.waitTime ?? 0,
              customerName: data.customerName ?? item.name,
              priorityType: data.priorityType ?? item.priorityType,
              priorityCategory: data.priorityCategory ?? item.priorityCategory,
              isWalkIn: data.isWalkIn ?? item.isWalkIn,
              next: data.next ?? null,
            })
          )
          await refreshStaffQueue()
          navigateTo("staff-serving")
        } catch {
          setAuthError("Could not reach the server to call this customer.")
        }
      })()
    },
    [currentUser, locations, refreshStaffQueue, navigateTo]
  )

  const addWalkIn = useCallback(
    async (
      item: Omit<StaffQueueItem, "id" | "position"> & { notes?: string }
    ): Promise<{ id: string; position: number } | { error: string }> => {
      if (!currentUser?.locationId || isDemoUser.current) {
        const message =
          "Sign in as staff assigned to a location to add a walk-in."
        setAuthError(message)
        return { error: message }
      }

      try {
        const res = await apiFetch("/api/staff/walk-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name.trim(),
            priority: item.priorityType,
            priorityCategory: item.priorityCategory ?? null,
            notes: item.notes?.trim() || null,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          id?: string
          position?: number
        }

        if (!res.ok || !data.id || data.position == null) {
          const message =
            data.error ??
            "Could not add walk-in to the queue. Make sure you are staff with a location assigned."
          setAuthError(message)
          return { error: message }
        }

        const newItem: StaffQueueItem = {
          id: data.id,
          position: data.position,
          name: item.name.trim(),
          waitDuration: 0,
          isWalkIn: true,
          priorityType: item.priorityType,
          priorityCategory: item.priorityCategory,
          hasSpecialNeeds:
            Boolean(item.notes) || item.priorityType !== "standard",
        }
        setLocationQueue((prev) => {
          const merged = [
            ...prev.filter((row) => row.id !== newItem.id),
            newItem,
          ]
          return merged.sort((a, b) => a.position - b.position)
        })

        await refreshStaffQueue()
        await loadLocations()

        return { id: data.id, position: data.position }
      } catch {
        const message = "Could not reach the server to add a walk-in."
        setAuthError(message)
        return { error: message }
      }
    },
    [currentUser, refreshStaffQueue, loadLocations]
  )

  const callNext = useCallback(() => {
    if (!currentUser?.locationId || isDemoUser.current) {
      setAuthError("Sign in as staff assigned to a location to call the queue.")
      return
    }

    void (async () => {
      try {
        clearAuthError()
        const res = await apiFetch("/api/staff/queue/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          currentlyServing?: StaffServingApiPayload
        } & Partial<StaffServingApiPayload & { userId?: string | null; locationId?: string }>

        if (res.status === 409 && data.currentlyServing) {
          setCurrentlyServing(servingFromApi(data.currentlyServing))
          await refreshStaffQueue()
          navigateTo("staff-serving")
          return
        }

        if (!res.ok || !data.id || !data.ticketNumber) {
          // Prefer JSON error; fall back when Cloudflare returns HTML 502.
          const message =
            formatApiErrorMessage(data, "") ||
            (res.status >= 500
              ? "Server timed out while calling the next person. Tap Call again — if they are already serving, you will open the serving screen."
              : "No one is waiting in this queue.")
          setAuthError(message)
          await refreshStaffQueue()
          return
        }

        if (data.userId) {
          dispatchQueuePush({
            userId: data.userId,
            body: notificationBody("your_turn"),
            url: "/queue",
          })
        }

        setCurrentlyServing(
          servingFromApi({
            id: data.id,
            ticketNumber: data.ticketNumber,
            waitTime: data.waitTime ?? 0,
            customerName: data.customerName ?? "Customer",
            priorityType: data.priorityType ?? "standard",
            priorityCategory: data.priorityCategory,
            isWalkIn: data.isWalkIn ?? false,
            next: data.next ?? null,
          })
        )
        await refreshStaffQueue()
        navigateTo("staff-serving")
      } catch {
        setAuthError("Could not reach the server to call the next person.")
        await refreshStaffQueue()
      }
    })()
  }, [currentUser, locations, refreshStaffQueue, navigateTo])

  // Staff couldn't verify the priority claim at the counter, so the person goes
  // back to the standard queue and the database re-slots them.
  const demoteToStandard = useCallback(() => {
    const serving = currentlyServing
    setCurrentlyServing(null)
    navigateTo("staff-dashboard")

    const entryId = serving?.id
    if (!supabase || !entryId || isDemoUser.current) return

    void (async () => {
      await supabase
        .from("queue_entries")
        .update({
          status: "waiting",
          priority: "standard",
          priority_category: null,
          serving_by: null,
          serving_started_at: null,
        })
        .eq("id", entryId)
        .eq("status", "serving")

      await recordAudit("queue.priority_demoted", `Priority claim not verified for ${serving.ticketNumber}`)

      if (currentUser?.locationId) {
        await refreshStaffQueue()
      }
    })()
  }, [supabase, currentlyServing, currentUser, refreshStaffQueue, recordAudit, navigateTo])

  const finishServing = useCallback(
    (status: "served" | "no-show") => {
      const servingId = currentlyServing?.id

      if (!currentUser?.locationId || isDemoUser.current) {
        setCurrentlyServing(null)
        navigateTo("staff-dashboard")
        return
      }

      void (async () => {
        try {
          const res = await apiFetch("/api/staff/queue/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryId: servingId, status }),
          })
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
            ok?: boolean
            userId?: string | null
          }

          if (!res.ok) {
            setAuthError(
              data.error ??
                "Could not finish service — this ticket may already be unlocked."
            )
            return
          }

          const notifiedUserId = data.userId ?? null
          if (notifiedUserId) {
            dispatchQueuePush({
              userId: notifiedUserId,
              body:
                status === "served"
                  ? notificationBody("rate_visit")
                  : notificationBody("no_show"),
              url: status === "served" ? "/rate" : "/notifications",
            })
          }

          setCurrentlyServing(null)
          await Promise.all([loadLocations(), refreshStaffQueue()])
          navigateTo("staff-dashboard")
        } catch {
          setAuthError("Could not reach the server to finish service.")
        }
      })()
    },
    [currentUser, currentlyServing, locations, loadLocations, refreshStaffQueue, navigateTo]
  )

  const completeService = useCallback(() => finishServing("served"), [finishServing])
  const skipNoShow = useCallback(() => finishServing("no-show"), [finishServing])

  const toggleBreak = useCallback(() => setIsOnBreak((v) => !v), [])

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      if (supabase && !isDemoUser.current) {
        void supabase.from("notifications").update({ read: true }).eq("id", id)
      }
    },
    [supabase]
  )

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (supabase && currentUser && !isDemoUser.current) {
      void supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", currentUser.id)
        .eq("read", false)
    }
  }, [supabase, currentUser])

  const submitVisitRating = useCallback(
    async (rating: number, comment: string) => {
      clearAuthError()
      if (!currentUser) return false
      if (rating < 1 || rating > 5) return false

      const pending =
        pendingVisitRating ?? (await loadPendingRating(currentUser.id))
      if (!pending) {
        setAuthError("You can only rate after being served.")
        return false
      }

      try {
        const res = await apiFetch("/api/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            comment,
            queueEntryId: pending.queueEntryId,
          }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setAuthError(data.error || "You can only rate after being served.")
          if (res.status === 403 || res.status === 409) {
            setPendingVisitRating(null)
          }
          return false
        }
      } catch {
        setAuthError("Could not submit your rating. Try again.")
        return false
      }

      setPendingVisitRating(null)
      return true
    },
    [currentUser, pendingVisitRating, loadPendingRating, clearAuthError]
  )

  const skipVisitRating = useCallback(() => {
    setPendingVisitRating(null)
  }, [])

  const refreshPendingRating = useCallback(async () => {
    if (!currentUser) return null
    return loadPendingRating(currentUser.id)
  }, [currentUser, loadPendingRating])

  const addLocation = useCallback(
    (location: Omit<Location, "id">) => {
      if (!supabase || isDemoUser.current) {
        setLocations((prev) => [...prev, { ...location, id: Date.now().toString() }])
        return
      }

      void (async () => {
        const { error } = await supabase.from("locations").insert({
          name: location.name,
          type: location.type,
          address: location.address,
          lat: location.coordinates.lat,
          lng: location.coordinates.lng,
          capacity: location.capacity,
          is_open: location.isOpen,
          description: location.description ?? null,
        })

        if (error) {
          setAuthError(error.message)
          return
        }
        await recordAudit("Location Added", `Added: ${location.name}`)
        await loadLocations()
      })()
    },
    [supabase, loadLocations, recordAudit]
  )

  const updateLocation = useCallback(
    (id: string, updates: Partial<Location>) => {
      const previous = locations.find((loc) => loc.id === id)

      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc))
      )

      if (!supabase || isDemoUser.current) return

      void (async () => {
        await supabase
          .from("locations")
          .update({
            ...(updates.name !== undefined && { name: updates.name }),
            ...(updates.type !== undefined && { type: updates.type }),
            ...(updates.address !== undefined && { address: updates.address }),
            ...(updates.capacity !== undefined && { capacity: updates.capacity }),
            ...(updates.isOpen !== undefined && { is_open: updates.isOpen }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.coordinates !== undefined && {
              lat: updates.coordinates.lat,
              lng: updates.coordinates.lng,
            }),
          })
          .eq("id", id)

        await recordAudit(
          "Location Updated",
          `Updated: ${updates.name ?? previous?.name ?? "location"}`
        )
        await loadLocations()
      })()
    },
    [supabase, locations, loadLocations, recordAudit]
  )

  const deleteLocation = useCallback(
    (id: string) => {
      const removed = locations.find((loc) => loc.id === id)
      setLocations((prev) => prev.filter((loc) => loc.id !== id))

      if (!supabase || isDemoUser.current) return

      void (async () => {
        await supabase.from("locations").delete().eq("id", id)
        await recordAudit(
          "Location Deleted",
          `Deleted: ${removed?.name ?? "location"}`
        )
        await loadLocations()
      })()
    },
    [supabase, locations, loadLocations, recordAudit]
  )

  const exportMyData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/user/export-data", { method: "GET" })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setAuthError(body.error || "Could not export your data.")
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") || ""
      const match = /filename="([^"]+)"/.exec(disposition)
      const filename =
        match?.[1] || `qflow-data-${new Date().toISOString().slice(0, 10)}.json`

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setAuthError("Could not export your data.")
    }
  }, [])

  const clearQueueHistory = useCallback(async (): Promise<boolean> => {
    if (!supabase || !currentUser || isDemoUser.current) {
      setQueueHistory([])
      return true
    }

    const { error } = await supabase
      .from("queue_history")
      .delete()
      .eq("user_id", currentUser.id)

    if (error) {
      await loadHistory(currentUser.id)
      setAuthError(error.message || "Could not delete line history.")
      return false
    }

    setQueueHistory([])
    return true
  }, [supabase, currentUser, loadHistory])

  const updateProfile = useCallback(
    async (updates: {
      name?: string
      cellNumber?: string | null
      smsNotifications?: boolean
      avatarUrl?: string | null
    }): Promise<boolean> => {
      if (!currentUser) return false

      const patch: {
        name?: string
        cell_number?: string | null
        sms_notifications?: boolean
        avatar_url?: string | null
      } = {}

      if (updates.name !== undefined) {
        const name = updates.name.trim()
        if (name.length < 2) return false
        patch.name = name
      }

      if (updates.cellNumber !== undefined) {
        if (updates.cellNumber === null || updates.cellNumber.trim() === "") {
          patch.cell_number = null
        } else {
          const formatted = formatSANumber(updates.cellNumber)
          if (!formatted) {
            setAuthError("Enter a valid South African mobile number.")
            return false
          }
          patch.cell_number = formatted
        }
      }

      if (updates.smsNotifications !== undefined) {
        patch.sms_notifications = updates.smsNotifications
      }

      if (updates.avatarUrl !== undefined) {
        patch.avatar_url = updates.avatarUrl
      }

      if (Object.keys(patch).length === 0) return false

      if (!supabase || isDemoUser.current) {
        setCurrentUser({
          ...currentUser,
          ...(patch.name ? { name: patch.name } : {}),
          ...(patch.cell_number !== undefined
            ? { cellNumber: patch.cell_number }
            : {}),
          ...(patch.sms_notifications !== undefined
            ? { smsNotifications: patch.sms_notifications }
            : {}),
          ...(patch.avatar_url !== undefined
            ? { avatar: patch.avatar_url ?? undefined }
            : {}),
        })
        return true
      }

      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", currentUser.id)

      if (error) {
        setAuthError(error.message)
        return false
      }

      if (patch.name) {
        void supabase.auth.updateUser({ data: { name: patch.name } })
      }

      setCurrentUser({
        ...currentUser,
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.cell_number !== undefined
          ? { cellNumber: patch.cell_number }
          : {}),
        ...(patch.sms_notifications !== undefined
          ? { smsNotifications: patch.sms_notifications }
          : {}),
        ...(patch.avatar_url !== undefined
          ? { avatar: patch.avatar_url ?? undefined }
          : {}),
      })
      return true
    },
    [supabase, currentUser]
  )

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang)
      if (typeof window !== "undefined") {
        window.localStorage.setItem("qflow_language", lang)
      }
      if (supabase && currentUser && !isDemoUser.current) {
        void supabase.from("profiles").update({ language: lang }).eq("id", currentUser.id)
      }
    },
    [supabase, currentUser]
  )

  const completeOnboarding = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("qflow_onboarding_done", "1")
    }
    setHasCompletedOnboarding(true)
    navigateTo("login")
  }, [])

  const walkIns = locationQueue.filter((item) => item.isWalkIn)
  const staffLocationName =
    locations.find((loc) => loc.id === staffLocationId)?.name ?? null

  return (
    <AppContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      isAuthLoading,
      supabaseEnabled,
      authError,
      clearAuthError,
      login,
      loginWithGoogle,
      logout,
      register,
      passwordResetEmail,
      startPasswordReset,
      verifyPasswordResetOtp,
      completePasswordReset,
      emailOtpEmail,
      emailOtpBackScreen,
      startEmailOtpLogin,
      startAdminPhoneOtp,
      startStaffLogin,
      resendStaffLoginOtp,
      verifyEmailOtpLogin,
      currentScreen,
      navigateTo,
      selectedLocation,
      setSelectedLocation,
      editingLocation,
      setEditingLocation,
      activeQueue,
      joinQueue,
      leaveQueue,
      currentlyServing,
      callNext,
      serveWalkIn,
      completeService,
      skipNoShow,
      demoteToStandard,
      isOnBreak,
      toggleBreak,
      locationQueue,
      walkIns,
      addWalkIn,
      staffLocationName,
      shiftSummary,
      refreshStaffQueue,
      staffQueueSyncStatus,
      staffQueueSyncError,
      pendingVisitRating,
      refreshPendingRating,
      submitVisitRating,
      skipVisitRating,
      locations,
      locationsReady,
      notifications,
      queueHistory,
      lastSyncedAt,
      refreshLocations: loadLocations,
      markNotificationRead,
      markAllNotificationsRead,
      exportMyData,
      clearQueueHistory,
      updateProfile,
      addLocation,
      updateLocation,
      deleteLocation,
      hasCompletedOnboarding,
      completeOnboarding,
      language,
      setLanguage,
      accessibility,
      setAccessibility,
      notificationPreferences,
      setNotificationPreferences,
      sessionExpiresAt,
      refreshSession
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
