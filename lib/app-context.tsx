"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
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
  pathAllowedForRole,
  pathForScreen,
  readLastRoute,
  screenFromPath,
} from "@/lib/routes"
import { validateStrongPassword } from "@/lib/password"
import { dispatchQueuePush } from "@/lib/push-client"

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
  joinQueue: (location: Location, priority?: { type: PriorityType; category?: string }) => void
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
  addWalkIn: (item: Omit<StaffQueueItem, "id" | "position"> & { notes?: string }) => void
  staffLocationName: string | null
  shiftSummary: ShiftSummary
  pendingVisitRating: PendingVisitRating | null
  refreshPendingRating: () => Promise<PendingVisitRating | null>
  submitVisitRating: (rating: number, comment: string) => Promise<boolean>
  skipVisitRating: () => void

  // Data
  locations: Location[]
  notifications: Notification[]
  queueHistory: QueueHistoryItem[]
  lastSyncedAt: Date | null
  refreshLocations: () => Promise<void>
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  exportMyData: () => void
  clearQueueHistory: () => Promise<void>
  updateProfile: (updates: { name: string }) => Promise<boolean>

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [queueHistory, setQueueHistory] = useState<QueueHistoryItem[]>([])
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem("qflow_onboarding_done") === "1"
  })
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
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en"
    const saved = window.localStorage.getItem("qflow_language")
    const allowed: Language[] = ["en", "af", "zu", "st", "xh", "tn"]
    return allowed.includes(saved as Language) ? (saved as Language) : "en"
  })
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    textSize: "normal",
    highContrast: false,
    simplifiedMode: false,
    buttonSize: "normal",
  })

  // Demo preview users have no Supabase session, so data writes are skipped for them
  const isDemoUser = useRef(false)
  // Staff/admin may only stay signed in after their dedicated OTP flow.
  // Refresh of an existing session is allowed.
  const staffOtpConfirmed = useRef(false)
  const adminOtpConfirmed = useRef(false)
  const currentUserRef = useRef<User | null>(null)

  currentUserRef.current = currentUser
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
    (role: UserRole) => {
      // Recovery / reset routes own navigation via ?rt= — do not bounce to role home.
      if (typeof window !== "undefined") {
        const path = window.location.pathname
        if (path.startsWith("/forgot-password")) return
      }
      if (PRE_AUTH_SCREENS.includes(screenFromPath(pathname))) {
        navigateTo(screenForRole(role))
      }
    },
    [navigateTo, pathname]
  )

  const loadLocations = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name")

    if (!error && data) {
      setLocations(data.map(mapDbLocation))
      setLastSyncedAt(new Date())
    }
  }, [supabase])

  const loadProfile = useCallback(
    async (userId: string, fallbackEmail: string, fallbackName?: string) => {
      if (!supabase) return null

      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, role, location_id, avatar_url, language")
        .eq("id", userId)
        .maybeSingle()

      const profile: User = {
        id: userId,
        name: data?.name || fallbackName || fallbackEmail.split("@")[0],
        email: data?.email || fallbackEmail,
        role: (data?.role as UserRole) ?? "user",
        avatar: data?.avatar_url ?? undefined,
        locationId: data?.location_id ?? null,
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

    const { data: served, error: servedError } = await supabase
      .from("queue_entries")
      .select("id, location_id, locations(name)")
      .eq("user_id", userId)
      .eq("status", "served")
      .not("served_at", "is", null)
      .order("served_at", { ascending: false })
      .limit(8)

    if (servedError || !served?.length) {
      setPendingVisitRating(null)
      return null
    }

    const { data: rated } = await supabase
      .from("visit_ratings")
      .select("queue_entry_id")
      .in(
        "queue_entry_id",
        served.map((row) => row.id)
      )

    const ratedIds = new Set(
      (rated ?? []).map((row) => row.queue_entry_id).filter(Boolean)
    )
    const next = served.find((row) => !ratedIds.has(row.id))
    if (!next) {
      setPendingVisitRating(null)
      return null
    }

    const loc = next.locations as unknown as { name: string } | null
    const pending: PendingVisitRating = {
      queueEntryId: next.id,
      locationId: next.location_id,
      locationName: loc?.name ?? "Location",
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

  // Staff view of their own location's queue. RLS already restricts this to the
  // staff member's location, but the filter keeps admins from seeing everything.
  const loadLocationQueue = useCallback(
    async (locationId: string) => {
      if (!supabase) return

      const { data } = await supabase
        .from("queue_entries")
        .select("id, position, joined_at, priority, priority_category, is_walk_in, walk_in_name, walk_in_notes, profiles(name)")
        .eq("location_id", locationId)
        .in("status", ["waiting", "almost"])
        .order("position")

      if (!data) return

      setLocationQueue(
        data.map((entry) => {
          const profile = entry.profiles as unknown as { name: string } | null
          const isWalkIn = entry.is_walk_in === true
          return {
            id: entry.id,
            position: entry.position,
            name: isWalkIn
              ? (entry.walk_in_name ?? "Walk-in")
              : (profile?.name ?? "Customer"),
            waitDuration: minutesSince(entry.joined_at),
            isWalkIn,
            priorityType: entry.priority ?? "standard",
            priorityCategory: entry.priority_category ?? undefined,
            hasSpecialNeeds: Boolean(entry.walk_in_notes),
          }
        })
      )
      setLastSyncedAt(new Date())
    },
    [supabase]
  )

  const loadShiftSummary = useCallback(
    async (locationId: string) => {
      if (!supabase) return

      const since = startOfToday()

      const [servedResult, noShowResult, waitingResult] = await Promise.all([
        supabase
          .from("queue_entries")
          .select("joined_at, served_at")
          .eq("location_id", locationId)
          .eq("status", "served")
          .gte("served_at", since),
        supabase
          .from("queue_entries")
          .select("id")
          .eq("location_id", locationId)
          .eq("status", "no-show")
          .gte("served_at", since),
        supabase
          .from("queue_entries")
          .select("id")
          .eq("location_id", locationId)
          .in("status", ["waiting", "almost", "your-turn"]),
      ])

      const served = servedResult.data ?? []
      const durations = served
        .filter((row) => row.served_at)
        .map(
          (row) =>
            (new Date(row.served_at!).getTime() -
              new Date(row.joined_at).getTime()) /
            60000
        )

      setShiftSummary({
        customersServed: served.length,
        noShows: noShowResult.data?.length ?? 0,
        avgServiceTime: durations.length
          ? Math.round(
              (durations.reduce((sum, d) => sum + d, 0) / durations.length) * 10
            ) / 10
          : null,
        queueRemaining: waitingResult.data?.length ?? 0,
      })
    },
    [supabase]
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

  // Surface OAuth errors from /auth/callback
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const err = params.get("auth_error")
    if (err) {
      setAuthError(err)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  // Track the Supabase session
  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false)
      return
    }

    let cancelled = false

    const rejectFreshPrivilegedSignIn = async (profile: User) => {
      if (profile.role === "staff" && !staffOtpConfirmed.current) {
        await supabase.auth.signOut()
        setCurrentUser(null)
        setAuthError(
          "Staff must sign in with email and password, then enter the code sent to your email."
        )
        navigateTo("staff-login")
        return true
      }
      if (profile.role === "admin" && !adminOtpConfirmed.current) {
        await supabase.auth.signOut()
        setCurrentUser(null)
        setAuthError("Admins must sign in with cellphone number, then the email code.")
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

        const profile = await loadProfile(
          data.user.id,
          data.user.email ?? "",
          (data.user.user_metadata?.name as string) ||
            (data.user.user_metadata?.full_name as string)
        )
        // Existing sessions (including staff after OTP) are allowed on refresh.
        if (!cancelled && profile) {
          isDemoUser.current = false
          if (profile.role === "staff") staffOtpConfirmed.current = true
          if (profile.role === "admin") adminOtpConfirmed.current = true
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
          staffOtpConfirmed.current = false
          adminOtpConfirmed.current = false
          setCurrentUser(null)
          setActiveQueue(null)
          setNotifications([])
          setQueueHistory([])
          setSessionExpiresAt(null)
          const onReset =
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/forgot-password")
          if (!isDemoUser.current && !onReset) {
            if (!PRE_AUTH_SCREENS.includes(screenFromPath(pathname))) {
              navigateTo("login")
            }
          }
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
              const profile = await loadProfile(
                user.id,
                user.email ?? "",
                (user.user_metadata?.name as string) ||
                  (user.user_metadata?.full_name as string)
              )
              if (cancelled || !profile) return
              if (isFreshSignIn && (await rejectFreshPrivilegedSignIn(profile))) return
              if (profile.role === "staff") staffOtpConfirmed.current = true
              if (profile.role === "admin") adminOtpConfirmed.current = true
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
  }, [supabase, loadProfile, loadUserData, goToRoleHome, navigateTo, pathname, router])

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

  // Staff dashboards need the whole queue at their assigned location
  const staffLocationId = currentUser?.locationId ?? null

  useEffect(() => {
    if (!supabase || !staffLocationId || isDemoUser.current) {
      setLocationQueue([])
      return
    }

    void loadLocationQueue(staffLocationId)
    void loadShiftSummary(staffLocationId)

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
          void loadLocationQueue(staffLocationId)
          void loadShiftSummary(staffLocationId)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, staffLocationId, loadLocationQueue, loadShiftSummary])

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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    })

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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    staffOtpConfirmed.current = false
    adminOtpConfirmed.current = false

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
        const res = await fetch("/api/auth/reset/send", {
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

      const advance = await fetch("/api/auth/reset/advance", {
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
        void fetch("/api/auth/reset/advance", {
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
        const res = await fetch("/api/admin/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          email?: string
        }
        if (!res.ok) {
          setAuthError(data.error || "Could not send admin login code.")
          return false
        }
        setEmailOtpEmail(null)
        setEmailOtpBackScreen("admin-phone-otp")
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
        const res = await fetch("/api/staff/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalized, password }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          email?: string
        }
        if (!res.ok) {
          setAuthError(data.error || "Could not start staff sign-in.")
          return false
        }
        const nextEmail = (data.email || normalized).trim().toLowerCase()
        setEmailOtpEmail(nextEmail)
        setEmailOtpBackScreen("staff-login")
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
        const res = await fetch("/api/staff/login", {
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
      clearAuthError()
      const isStaffFlow = emailOtpBackScreen === "staff-login"
      const isAdminFlow = emailOtpBackScreen === "admin-phone-otp"

      if (!supabase) {
        navigateTo(emailOtpBackScreen)
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

        adminOtpConfirmed.current = true
        try {
          const res = await fetch("/api/admin/otp/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, token: otp }),
          })
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          if (!res.ok) {
            adminOtpConfirmed.current = false
            setAuthError(data.error || "Invalid login code.")
            return
          }
        } catch {
          adminOtpConfirmed.current = false
          setAuthError("Could not verify the admin login code.")
          return
        }

        await supabase.auth.getSession()
        const { data: userData } = await supabase.auth.getUser()
        const user = userData.user
        if (!user) {
          adminOtpConfirmed.current = false
          setAuthError("Could not start an admin session. Try again.")
          return
        }

        setEmailOtpEmail(null)
        setEmailOtpBackScreen("email-otp")
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
          adminOtpConfirmed.current = false
          await supabase.auth.signOut()
          setCurrentUser(null)
          setAuthError("This login code is not for an admin account.")
          navigateTo("admin-phone-otp")
          return
        }

        await loadUserData(user.id)
        goToRoleHome(profile.role)
        return
      }

      if (!emailOtpEmail) {
        navigateTo(emailOtpBackScreen)
        return
      }

      const email = emailOtpEmail
      const types = isStaffFlow
        ? (["magiclink", "email"] as const)
        : (["email"] as const)

      if (isStaffFlow) {
        staffOtpConfirmed.current = true
      }

      let user =
        null as
          | { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
          | null

      let lastError: string | null = null
      for (const type of types) {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type,
        })
        if (!error) {
          user = data.session?.user ?? data.user
          break
        }
        lastError = error.message
      }

      if (!user) {
        if (isStaffFlow) staffOtpConfirmed.current = false
        setAuthError(lastError || "Invalid login code.")
        return
      }

      setEmailOtpEmail(null)
      setEmailOtpBackScreen("email-otp")
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
        staffOtpConfirmed.current = false
        await supabase.auth.signOut()
        setCurrentUser(null)
        setAuthError("This login code is not for a staff account.")
        navigateTo("staff-login")
        return
      }

      if (profile?.role === "admin" && !adminOtpConfirmed.current) {
        await supabase.auth.signOut()
        setCurrentUser(null)
        setAuthError("Admins must sign in with cellphone number, then the email code.")
        navigateTo("admin-phone-otp")
        return
      }

      await loadUserData(user.id)
      if (profile) goToRoleHome(profile.role)
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
    (location: Location, priority?: { type: PriorityType; category?: string }) => {
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
        })
        navigateTo("my-queue")
        return
      }

      void (async () => {
        const { error } = await supabase.from("queue_entries").insert({
          user_id: currentUser.id,
          location_id: location.id,
          priority: priority?.type ?? "standard",
          priority_category: priority?.category ?? null,
        })

        if (error) {
          if (/duplicate key|unique|queue_entries_active_unique/i.test(error.message)) {
            setAuthError("You are already in this queue.")
          } else {
            setAuthError(error.message)
          }
          return
        }

        await Promise.all([loadActiveQueue(currentUser.id), loadLocations()])
        navigateTo("my-queue")
      })()
    },
    [supabase, currentUser, loadActiveQueue, loadLocations]
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
      if (!supabase || !currentUser?.locationId || isDemoUser.current) {
        setAuthError("Sign in as staff assigned to a location to serve the queue.")
        return
      }

      void (async () => {
        const { data: claimed, error: claimError } = await supabase.rpc(
          "claim_queue_entry",
          { p_entry_id: item.id }
        )

        if (claimError) {
          setAuthError(claimError.message)
          return
        }

        if (!claimed) {
          setAuthError("That queue entry is no longer waiting (it may already be locked).")
          return
        }

        const { data: remaining } = await supabase
          .from("queue_entries")
          .select("position, joined_at")
          .eq("location_id", claimed.location_id)
          .in("status", ["waiting", "almost"])
          .order("position")
          .limit(1)

        let customerName = item.name
        if (claimed.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", claimed.user_id)
            .maybeSingle()
          customerName = profile?.name ?? item.name
        } else if (claimed.walk_in_name) {
          customerName = claimed.walk_in_name
        }

        if (claimed.user_id) {
          dispatchQueuePush({
            userId: claimed.user_id,
            body: "It is your turn. Please head to the counter.",
            url: "/queue",
          })
        }

        const upNext = remaining?.[0]

        setCurrentlyServing({
          id: claimed.id,
          ticketNumber: `#${String(claimed.position).padStart(3, "0")}`,
          waitTime: minutesSince(claimed.joined_at),
          customerName,
          priorityType: claimed.priority ?? "standard",
          priorityCategory: claimed.priority_category ?? undefined,
          isWalkIn: claimed.is_walk_in === true,
          next: upNext
            ? {
                ticketNumber: `#${String(upNext.position).padStart(3, "0")}`,
                waitTime: minutesSince(upNext.joined_at),
              }
            : null,
        })
        navigateTo("staff-serving")
      })()
    },
    [supabase, currentUser]
  )

  const addWalkIn = useCallback(
    (item: Omit<StaffQueueItem, "id" | "position"> & { notes?: string }) => {
      if (!supabase || !currentUser?.locationId || isDemoUser.current) {
        setAuthError("Sign in as staff assigned to a location to add a walk-in.")
        return
      }

      void (async () => {
        const { error } = await supabase.from("queue_entries").insert({
          location_id: currentUser.locationId!,
          is_walk_in: true,
          walk_in_name: item.name.trim(),
          walk_in_notes: item.notes?.trim() || null,
          priority: item.priorityType,
          priority_category: item.priorityCategory ?? null,
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        await recordAudit("Walk-in added", item.name.trim())
        await loadLocationQueue(currentUser.locationId!)
      })()
    },
    [supabase, currentUser, loadLocationQueue, recordAudit]
  )

  const callNext = useCallback(() => {
    if (!supabase || !currentUser?.locationId || isDemoUser.current) {
      setAuthError("Sign in as staff assigned to a location to call the queue.")
      return
    }

    void (async () => {
      const { data: claimed, error: claimError } = await supabase.rpc(
        "claim_next_queue_entry",
        { p_location_id: currentUser.locationId! }
      )

      if (claimError) {
        setAuthError(claimError.message)
        return
      }

      if (!claimed) {
        setAuthError("No one is waiting in this queue.")
        return
      }

      const { data: remaining } = await supabase
        .from("queue_entries")
        .select("position, joined_at")
        .eq("location_id", claimed.location_id)
        .in("status", ["waiting", "almost"])
        .order("position")
        .limit(1)

      let customerName = "Customer"
      if (claimed.is_walk_in) {
        customerName = claimed.walk_in_name ?? "Walk-in"
      } else if (claimed.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", claimed.user_id)
          .maybeSingle()
        customerName = profile?.name ?? "Customer"
      }

      if (claimed.user_id) {
        dispatchQueuePush({
          userId: claimed.user_id,
          body: "It is your turn. Please head to the counter.",
          url: "/queue",
        })
      }

      const upNext = remaining?.[0]

      setCurrentlyServing({
        id: claimed.id,
        ticketNumber: `#${String(claimed.position).padStart(3, "0")}`,
        waitTime: minutesSince(claimed.joined_at),
        customerName,
        priorityType: claimed.priority ?? "standard",
        priorityCategory: claimed.priority_category ?? undefined,
        isWalkIn: claimed.is_walk_in === true,
        next: upNext
          ? {
              ticketNumber: `#${String(upNext.position).padStart(3, "0")}`,
              waitTime: minutesSince(upNext.joined_at),
            }
          : null,
      })
      navigateTo("staff-serving")
    })()
  }, [supabase, currentUser])

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
        await loadLocationQueue(currentUser.locationId)
      }
    })()
  }, [supabase, currentlyServing, currentUser, loadLocationQueue, recordAudit])

  const finishServing = useCallback(
    (status: "served" | "no-show") => {
      const servingId = currentlyServing?.id

      if (!supabase || !currentUser?.locationId || isDemoUser.current) {
        setCurrentlyServing(null)
        navigateTo("staff-dashboard")
        return
      }

      void (async () => {
        let notifiedUserId: string | null = null

        if (servingId) {
          const { data: row } = await supabase
            .from("queue_entries")
            .select("user_id")
            .eq("id", servingId)
            .eq("status", "serving")
            .maybeSingle()
          notifiedUserId = row?.user_id ?? null

          const { data: updated, error: finishError } = await supabase
            .from("queue_entries")
            .update({
              status,
              served_at: new Date().toISOString(),
              serving_by: null,
              serving_started_at: null,
            })
            .eq("id", servingId)
            .eq("status", "serving")
            .select("id")
            .maybeSingle()

          if (finishError || !updated) {
            setAuthError(
              finishError?.message ||
                "Could not finish service — this ticket may already be unlocked."
            )
          }
        } else {
          const { data } = await supabase
            .from("queue_entries")
            .select("id, user_id")
            .eq("location_id", currentUser.locationId!)
            .eq("status", "serving")
            .order("serving_started_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (data) {
            notifiedUserId = data.user_id
            await supabase
              .from("queue_entries")
              .update({
                status,
                served_at: new Date().toISOString(),
                serving_by: null,
                serving_started_at: null,
              })
              .eq("id", data.id)
              .eq("status", "serving")
          }
        }

        if (notifiedUserId) {
          dispatchQueuePush({
            userId: notifiedUserId,
            body:
              status === "served"
                ? "How was your visit? Tap to rate your experience."
                : "You were marked as a no-show.",
            url: status === "served" ? "/rate" : "/notifications",
          })
        }

        setCurrentlyServing(null)
        await Promise.all([
          loadLocations(),
          loadLocationQueue(currentUser.locationId!),
          loadShiftSummary(currentUser.locationId!),
        ])
        navigateTo("staff-dashboard")
      })()
    },
    [
      supabase,
      currentUser,
      currentlyServing,
      loadLocations,
      loadLocationQueue,
      loadShiftSummary,
    ]
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
      if (!supabase || !currentUser) return false
      if (rating < 1 || rating > 5) return false

      const pending =
        pendingVisitRating ?? (await loadPendingRating(currentUser.id))
      if (!pending) {
        setAuthError("There is no visit to rate yet.")
        return false
      }

      const { error } = await supabase.from("visit_ratings").insert({
        user_id: currentUser.id,
        location_id: pending.locationId,
        queue_entry_id: pending.queueEntryId,
        rating,
        comment: comment.trim() || null,
      })

      if (error) {
        if (error.code === "23505") {
          setPendingVisitRating(null)
          return true
        }
        setAuthError(error.message)
        return false
      }

      setPendingVisitRating(null)
      return true
    },
    [supabase, currentUser, pendingVisitRating, loadPendingRating, clearAuthError]
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

  const exportMyData = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: currentUser,
      activeQueue,
      queueHistory,
      notifications,
    }

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `qflow-data-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [currentUser, activeQueue, queueHistory, notifications])

  const clearQueueHistory = useCallback(async () => {
    setQueueHistory([])
    if (!supabase || !currentUser || isDemoUser.current) return
    await supabase.from("queue_history").delete().eq("user_id", currentUser.id)
  }, [supabase, currentUser])

  const updateProfile = useCallback(
    async (updates: { name: string }): Promise<boolean> => {
      const name = updates.name.trim()
      if (!currentUser || name.length < 2) return false

      if (!supabase || isDemoUser.current) {
        setCurrentUser({ ...currentUser, name })
        return true
      }

      const { error } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", currentUser.id)

      if (error) {
        setAuthError(error.message)
        return false
      }

      void supabase.auth.updateUser({ data: { name } })
      setCurrentUser({ ...currentUser, name })
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
      pendingVisitRating,
      refreshPendingRating,
      submitVisitRating,
      skipVisitRating,
      locations,
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
