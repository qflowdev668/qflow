"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { createPortal } from "react-dom"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion"
import { Bell, ChevronUp, MapPin } from "lucide-react"
import { useApp } from "@/lib/app-context"
import { RollerDigit } from "@/components/qflow/roller-digit"
import { JoinQueuePanel } from "@/components/qflow/join-queue-panel"
import { RouteSummaryCard } from "@/components/qflow/route-summary-card"
import {
  clearActiveRoute,
  setActiveRoute,
  useActiveRoute,
} from "@/lib/active-route-store"
import { detectUserLocation } from "@/lib/map-geolocation"
import { fetchMapboxRoute, type TravelProfile } from "@/lib/mapbox-directions"
import {
  FLOW_BAR_BOTTOM_NO_NAV,
  FLOW_BAR_BOTTOM_WITH_NAV,
} from "@/lib/bottom-chrome"
import { useHasBottomNav } from "@/hooks/use-chrome-insets"
import { cn } from "@/lib/utils"

const CHEVRON_SEEN_KEY = "qflow-flowbar-chevron-seen"
const LAYOUT_ID = "qflow-flow-bar"

const springOpen = { type: "spring" as const, stiffness: 300, damping: 30 }
const springClose = { type: "spring" as const, stiffness: 380, damping: 36 }

function isYourTurnStatus(status: string) {
  return status === "your-turn" || status === "serving"
}

/**
 * Persistent queue status bar above the bottom tab nav.
 * Collapsed pill morphs into an expanded sheet via Framer Motion layoutId.
 */
export function FlowBar() {
  const { activeQueue, currentUser, locations, currentScreen } = useApp()
  const activeRoute = useActiveRoute()
  const reduceMotion = useReducedMotion()
  const hasBottomNav = useHasBottomNav()
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [chevronBounce, setChevronBounce] = useState(false)
  const [yourTurnPulse, setYourTurnPulse] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [canOfferDirections, setCanOfferDirections] = useState(false)
  const prevStatusRef = useRef<string | null>(null)
  const expandedFullyRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const visible =
    Boolean(currentUser) &&
    Boolean(activeQueue) &&
    activeQueue !== null &&
    ["waiting", "almost", "your-turn", "serving"].includes(activeQueue.status) &&
    // Intentionally hidden on /queue (My line): that page is already the full
    // detail view — showing the Flow Bar pill there is redundant and collided
    // with the tab bar. Do not "restore" it here without revisiting layout.
    currentScreen !== "my-queue"

  useEffect(() => {
    if (!visible) setExpanded(false)
  }, [visible])

  useEffect(() => {
    if (!visible || typeof window === "undefined") return
    try {
      if (!window.localStorage.getItem(CHEVRON_SEEN_KEY)) {
        setChevronBounce(true)
        window.localStorage.setItem(CHEVRON_SEEN_KEY, "1")
        const timer = window.setTimeout(() => setChevronBounce(false), 900)
        return () => window.clearTimeout(timer)
      }
    } catch {
      /* private mode */
    }
  }, [visible])

  useEffect(() => {
    if (!activeQueue) {
      prevStatusRef.current = null
      return
    }
    const prev = prevStatusRef.current
    const next = activeQueue.status
    if (
      prev &&
      prev !== "your-turn" &&
      prev !== "serving" &&
      (next === "your-turn" || next === "serving")
    ) {
      setYourTurnPulse(true)
      const timer = window.setTimeout(() => setYourTurnPulse(false), 900)
      prevStatusRef.current = next
      return () => window.clearTimeout(timer)
    }
    prevStatusRef.current = next
  }, [activeQueue])

  const expand = useCallback(() => {
    if (expanded || reduceMotion) {
      setExpanded(true)
      if (!expandedFullyRef.current && typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(10)
        } catch {
          /* ignore */
        }
        expandedFullyRef.current = true
      }
      return
    }
    setCompressing(true)
    window.setTimeout(() => {
      setCompressing(false)
      setExpanded(true)
      if (!expandedFullyRef.current && typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(10)
        } catch {
          /* ignore */
        }
        expandedFullyRef.current = true
      }
    }, 80)
  }, [expanded, reduceMotion])

  const collapse = useCallback(() => {
    setExpanded(false)
  }, [])

  useEffect(() => {
    if (!expanded) return
    let cancelled = false
    void detectUserLocation().then((result) => {
      if (!cancelled) setCanOfferDirections(result.ok)
    })
    return () => {
      cancelled = true
    }
  }, [expanded])

  const queueLocation = activeQueue
    ? locations.find((loc) => loc.id === activeQueue.locationId)
    : null

  const routeForThisQueue =
    activeRoute &&
    activeQueue &&
    (activeRoute.queueEntryId === activeQueue.id ||
      activeRoute.locationId === activeQueue.locationId)
      ? activeRoute
      : null

  const requestDirections = useCallback(
    async (profile: TravelProfile = "walking") => {
      if (!activeQueue || !queueLocation) return
      setRouteLoading(true)
      setRouteError(null)
      const geo = await detectUserLocation()
      if (!geo.ok) {
        setRouteLoading(false)
        setRouteError("Enable location to get directions.")
        setCanOfferDirections(false)
        return
      }
      setCanOfferDirections(true)

      if (activeRoute && activeRoute.locationId !== queueLocation.id) {
        clearActiveRoute()
      }

      const result = await fetchMapboxRoute(
        geo.coords,
        queueLocation.coordinates,
        profile
      )
      setRouteLoading(false)
      if (!result.ok) {
        setRouteError(result.error)
        return
      }
      setActiveRoute({
        queueEntryId: activeQueue.id,
        locationId: queueLocation.id,
        locationCoords: queueLocation.coordinates,
        route: result.route,
      })
    },
    [activeQueue, queueLocation, activeRoute]
  )

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") collapse()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expanded, collapse])

  const onPillKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      expand()
    }
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) {
      collapse()
    }
  }

  const isCustomer =
    !currentUser || currentUser.role === "user"

  if (!mounted || !visible || !activeQueue || !isCustomer) return null

  const priority = activeQueue.priorityType ?? "standard"
  const isYourTurn = isYourTurnStatus(activeQueue.status)
  const pulseFast = priority === "emergency"

  const priorityRing =
    priority === "emergency"
      ? "ring-2 ring-[#EF4444]/80 shadow-[0_0_16px_rgba(239,68,68,0.45)]"
      : priority === "fast-track"
        ? "ring-2 ring-[#F59E0B]/80 shadow-[0_0_16px_rgba(245,158,11,0.4)]"
        : ""

  const chrome = (
    <>
      <AnimatePresence>
        {expanded && (
          <motion.button
            type="button"
            aria-label="Close queue details"
            className="fixed inset-0 z-[65] mx-auto max-w-md bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: expanded ? 0.42 : 0.28 }
            }
            onClick={collapse}
          />
        )}
      </AnimatePresence>

      <div
        data-testid="flow-bar-chrome"
        className={cn(
          "pointer-events-none fixed left-1/2 z-[66] w-full max-w-md -translate-x-1/2 px-4",
          expanded && "top-0 flex flex-col justify-end"
        )}
        style={{
          // Clear BottomNav when it is mounted; otherwise sit just above the
          // safe area so profile/help Save CTAs can stack above the pill.
          bottom: hasBottomNav ? FLOW_BAR_BOTTOM_WITH_NAV : FLOW_BAR_BOTTOM_NO_NAV,
        }}
      >
        <AnimatePresence mode="wait">
          {!expanded ? (
            <div className="pointer-events-auto flex w-full flex-col gap-2">
              {routeForThisQueue && (
                <RouteSummaryCard
                  route={routeForThisQueue.route}
                  destination={routeForThisQueue.locationCoords}
                  travelProfile={routeForThisQueue.route.profile}
                  loading={routeLoading}
                  error={routeError}
                  compact
                  onRetry={() => void requestDirections(routeForThisQueue.route.profile)}
                  onProfileChange={(profile) => void requestDirections(profile)}
                  className="shadow-md"
                />
              )}
              <motion.div
              key="collapsed"
              layoutId={LAYOUT_ID}
              role="button"
              tabIndex={0}
              aria-expanded={false}
              aria-label={`Queue at ${activeQueue.locationName}, position ${activeQueue.position}`}
              data-testid="flow-bar"
              data-priority={priority}
              data-status={activeQueue.status}
              data-variant={
                priority === "emergency"
                  ? "emergency"
                  : priority === "fast-track"
                    ? "fast-track"
                    : "standard"
              }
              className={cn(
                "h-[60px] w-full rounded-2xl flex items-center gap-3 px-4 cursor-pointer",
                "text-white border border-white/15",
                "bg-[rgba(37,99,235,0.85)] backdrop-blur-[20px]",
                priorityRing,
                yourTurnPulse && !reduceMotion && "flowbar-your-turn",
                compressing && !reduceMotion && "scale-y-[0.96]"
              )}
              style={{ transformOrigin: "center bottom" }}
              transition={reduceMotion ? { duration: 0 } : springOpen}
              onClick={expand}
              onKeyDown={onPillKeyDown}
              drag={!reduceMotion ? "y" : false}
              dragConstraints={{ top: -40, bottom: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.y < -24) expand()
              }}
            >
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full bg-white shrink-0",
                  !reduceMotion && (pulseFast ? "flowbar-pulse-fast" : "flowbar-pulse"),
                  isYourTurn && "bg-amber-300"
                )}
                aria-hidden
              />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {activeQueue.locationName}
                </span>
                {isYourTurn ? (
                  <Bell
                    className={cn(
                      "w-5 h-5 shrink-0 text-amber-200",
                      yourTurnPulse && !reduceMotion && "scale-110"
                    )}
                    aria-hidden
                  />
                ) : (
                  <span className="text-sm font-bold shrink-0 inline-flex items-baseline gap-0.5">
                    #<RollerDigit value={activeQueue.position} className="text-white" />
                  </span>
                )}
              </div>
              <ChevronUp
                className={cn(
                  "w-5 h-5 shrink-0 opacity-90",
                  chevronBounce && !reduceMotion && "flowbar-chevron-bounce"
                )}
                aria-hidden
              />
            </motion.div>
            </div>
          ) : (
            <motion.div
              key="expanded"
              layoutId={LAYOUT_ID}
              role="dialog"
              aria-modal="true"
              aria-label="Queue details"
              data-testid="flow-bar-expanded"
              data-priority={priority}
              className={cn(
                "pointer-events-auto w-full max-h-[85vh] overflow-hidden rounded-t-3xl",
                "bg-white text-foreground shadow-2xl border border-border/60",
                "flex flex-col safe-area-pb"
              )}
              transition={reduceMotion ? { duration: 0 } : springClose}
              drag={!reduceMotion ? "y" : false}
              dragConstraints={{ top: 0, bottom: 120 }}
              dragElastic={0.12}
              onDragEnd={onDragEnd}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-4 pb-2">
                <h2 className="text-xl font-bold leading-tight">
                  {activeQueue.locationName}
                </h2>
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{activeQueue.locationAddress}</span>
                </p>
              </div>
              <motion.div
                className="px-4 pb-6 overflow-y-auto flex-1"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { delay: 0.15, staggerChildren: 0.04, duration: 0.25 }
                }
              >
                {isYourTurn && (
                  <p className="mb-3 text-sm font-semibold text-[#D97706]" role="status">
                    It is your turn — please go to the counter
                  </p>
                )}
                {routeForThisQueue ? (
                  <div className="mb-3">
                    <RouteSummaryCard
                      route={routeForThisQueue.route}
                      destination={routeForThisQueue.locationCoords}
                      travelProfile={routeForThisQueue.route.profile}
                      loading={routeLoading}
                      error={routeError}
                      onRetry={() => void requestDirections(routeForThisQueue.route.profile)}
                      onProfileChange={(profile) => void requestDirections(profile)}
                      className="shadow-none"
                    />
                  </div>
                ) : null}
                <JoinQueuePanel
                  mode="active"
                  useRollerDigits
                  onLeft={collapse}
                  showDirections={
                    !routeForThisQueue && (canOfferDirections || Boolean(routeError))
                  }
                  onDirections={() => void requestDirections("walking")}
                />
                {routeLoading && !routeForThisQueue && (
                  <p className="mt-2 text-sm text-muted-foreground">Calculating directions…</p>
                )}
                {routeError && !routeForThisQueue && (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {routeError}
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )

  return createPortal(chrome, document.body)
}
