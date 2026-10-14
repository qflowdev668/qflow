"use client"

import { useEffect, useState } from "react"
import { useApp, type Location, type PriorityType } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import type { TranslationKeys } from "@/lib/i18n"
import { isPkceVerifierError } from "@/lib/auth-code"
import { estimateWait } from "@/lib/supabase/helpers"
import { useOfflineStatus } from "@/components/qflow/offline-banner"
import { Button } from "@/components/ui/button"
import { RollerDigit } from "@/components/qflow/roller-digit"
import {
  Accessibility,
  Baby,
  Car,
  ChevronDown,
  Clock,
  Flame,
  HeartPulse,
  Medal,
  Navigation,
  Shield,
  Siren,
  UserCircle,
  Users,
  Backpack,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type PriorityCategory =
  | "police"
  | "paramedic"
  | "firefighter"
  | "traffic"
  | "military"
  | "learner"
  | "pregnant"
  | "disability"
  | "elderly"
  | "infant"
  | "distress"
  | null

const emergencyIds = ["police", "paramedic", "firefighter", "traffic", "military"] as const
const fastTrackIds = ["learner", "pregnant", "disability", "elderly", "infant", "distress"] as const

const emergencyIcons = {
  police: Shield,
  paramedic: Siren,
  firefighter: Flame,
  traffic: Car,
  military: Medal,
} as const

const fastTrackIcons = {
  learner: Backpack,
  pregnant: UserCircle,
  disability: Accessibility,
  elderly: UserCircle,
  infant: Baby,
  distress: HeartPulse,
} as const

function priorityLabel(t: TranslationKeys, id: Exclude<PriorityCategory, null>) {
  const labels: Record<Exclude<PriorityCategory, null>, string> = {
    police: t.priorityPolice,
    paramedic: t.priorityParamedic,
    firefighter: t.priorityFirefighter,
    traffic: t.priorityTraffic,
    military: t.priorityMilitary,
    learner: t.priorityLearner,
    pregnant: t.priorityPregnant,
    disability: t.priorityDisability,
    elderly: t.priorityElderly,
    infant: t.priorityInfant,
    distress: t.priorityDistress,
  }
  return labels[id]
}

export type JoinQueuePanelMode = "join" | "active"

type JoinQueuePanelProps = {
  location?: Location | null
  /** join = pick priority + join; active = in-line stats + leave */
  mode?: JoinQueuePanelMode
  /** Animate wait / people numbers with RollerDigit (Flow Bar expanded). */
  useRollerDigits?: boolean
  /** Show Directions when user geolocation is available (map flow). */
  showDirections?: boolean
  onDirections?: () => void
  /** Disables the button and shows progress while the route is calculated. */
  directionsBusy?: boolean
  onJoined?: () => void
  onLeft?: () => void
  onViewQueue?: () => void
  className?: string
}

/**
 * Shared join / in-queue panel body used by JoinQueueDrawer and Flow Bar expanded sheet.
 */
export function JoinQueuePanel({
  location,
  mode = "join",
  useRollerDigits = false,
  showDirections = false,
  onDirections,
  directionsBusy = false,
  onJoined,
  onLeft,
  onViewQueue,
  className,
}: JoinQueuePanelProps) {
  const {
    joinQueue,
    leaveQueue,
    navigateTo,
    selectedLocation,
    activeQueue,
    authError,
    clearAuthError,
  } = useApp()
  const t = useT()
  const isOffline = useOfflineStatus()
  const loc = location ?? selectedLocation
  const isActiveMode = mode === "active"

  const [priority, setPriority] = useState<PriorityCategory>(null)
  const [showPriority, setShowPriority] = useState(false)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (isActiveMode) return
    setPriority(null)
    setShowPriority(false)
    setJoining(false)
    clearAuthError()
  }, [loc?.id, clearAuthError, isActiveMode])

  const isEmergency = Boolean(
    priority && emergencyIds.includes(priority as (typeof emergencyIds)[number])
  )
  const isFastTrack = Boolean(
    priority && fastTrackIds.includes(priority as (typeof fastTrackIds)[number])
  )

  const peopleAhead = isActiveMode
    ? Math.max((activeQueue?.position ?? 1) - 1, 0)
    : (loc?.queueCount ?? 0)
  const wait = isActiveMode
    ? (activeQueue?.estimatedWait ?? estimateWait(peopleAhead))
    : estimateWait(peopleAhead)

  const isFull = loc ? loc.queueCount >= loc.capacity : false
  const isClosed = loc ? !loc.isOpen : true
  const alreadyHere = Boolean(activeQueue && loc && activeQueue.locationId === loc.id)
  const inOtherLine = Boolean(activeQueue && loc && activeQueue.locationId !== loc.id)
  const canLeaveToJoin =
    inOtherLine &&
    activeQueue?.status !== "your-turn" &&
    activeQueue?.status !== "serving"
  const canJoin = Boolean(
    loc &&
      !isOffline &&
      !isFull &&
      !isClosed &&
      !alreadyHere &&
      !joining &&
      (!inOtherLine || canLeaveToJoin)
  )

  const handleJoin = async () => {
    if (!loc || !canJoin) return
    clearAuthError()
    setJoining(true)
    try {
      const type: PriorityType = isEmergency
        ? "emergency"
        : isFastTrack
          ? "fast-track"
          : "standard"
      const category = priority ? priorityLabel(t, priority) : undefined
      const ok = await joinQueue(loc, { type, category })
      if (ok) onJoined?.()
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = () => {
    if (leaving) return
    setLeaving(true)
    leaveQueue()
    onLeft?.()
  }

  const WaitValue = useRollerDigits ? (
    <span className="text-lg font-bold mt-0.5 inline-flex items-baseline gap-1">
      <RollerDigit value={wait} />
      <span>{t.minUnit}</span>
    </span>
  ) : (
    <p className="text-lg font-bold mt-0.5">
      {wait} {t.minUnit}
    </p>
  )

  const PeopleValue = useRollerDigits ? (
    <p className="text-lg font-bold mt-0.5">
      <RollerDigit value={peopleAhead} />
    </p>
  ) : (
    <p className="text-lg font-bold mt-0.5">{peopleAhead}</p>
  )

  return (
    <div className={cn("space-y-5", className)} data-testid="join-queue-panel">
      {(loc || isActiveMode) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/70 px-4 py-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {t.estimatedWait}
            </div>
            {WaitValue}
          </div>
          <div className="rounded-xl bg-muted/70 px-4 py-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {t.peopleAheadShort}
            </div>
            {PeopleValue}
          </div>
        </div>
      )}

      {showDirections && onDirections && (loc || isActiveMode) && (
        <Button
          type="button"
          variant="outline"
          data-testid="directions-button"
          onPointerDown={(event) => event.stopPropagation()}
          disabled={directionsBusy}
          onClick={onDirections}
          className="w-full h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 border-0 text-base font-semibold"
        >
          <Navigation className="w-4 h-4 mr-2" />
          {directionsBusy ? "Getting directions…" : t.getDirections}
        </Button>
      )}

      {!isActiveMode && (
        <>
          {isClosed && loc && (
            <p className="text-sm text-destructive">{t.notAcceptingQueues}</p>
          )}
          {isFull && loc && !isClosed && (
            <p className="text-sm text-destructive">{t.queueIsFull}</p>
          )}
          {isOffline && (
            <p className="text-sm text-destructive">{t.needInternetToJoin}</p>
          )}
          {alreadyHere && (
            <p className="text-sm text-foreground">{t.youreInQueue}</p>
          )}
          {inOtherLine && activeQueue && (
            <p className="text-sm text-amber-700">
              {t.leavingQueueWarning
                .replace("{name}", activeQueue.locationName)
                .replace("{position}", String(activeQueue.position))}
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowPriority((v) => !v)}
            className="w-full flex items-center justify-between rounded-xl border border-border px-3 py-3 text-left"
          >
            <span className="text-sm font-medium">{t.qualifyForPriority}</span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showPriority && "rotate-180"
              )}
            />
          </button>

          {showPriority && (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t.emergencyPriority}
              </p>
              <div className="flex flex-wrap gap-2">
                {emergencyIds.map((id) => {
                  const Icon = emergencyIcons[id]
                  const selected = priority === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPriority(selected ? null : id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-sm font-medium min-h-[44px]",
                        selected
                          ? "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]"
                          : "border-border"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {priorityLabel(t, id)}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t.fastTrackPriority}
              </p>
              <div className="flex flex-wrap gap-2">
                {fastTrackIds.map((id) => {
                  const Icon = fastTrackIcons[id]
                  const selected = priority === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPriority(selected ? null : id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-sm font-medium min-h-[44px]",
                        selected
                          ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                          : "border-border"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {priorityLabel(t, id)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {isActiveMode && activeQueue?.priorityType && activeQueue.priorityType !== "standard" && (
        <p className="text-sm text-muted-foreground">
          {activeQueue.priorityType === "emergency"
            ? t.emergencyPriority
            : t.fastTrackPriority}
          {activeQueue.priorityCategory ? ` · ${activeQueue.priorityCategory}` : ""}
        </p>
      )}

      {authError && !isPkceVerifierError(authError) && (
        <p className="text-sm text-destructive" role="alert">
          {authError}
        </p>
      )}

      <div className="pt-1">
        {isActiveMode ? (
          <Button
            className="w-full h-14 text-base font-semibold rounded-xl border-2 border-[#EF4444] bg-transparent text-[#EF4444] hover:bg-red-50"
            variant="outline"
            disabled={isOffline || leaving}
            onClick={handleLeave}
          >
            {leaving ? t.saving : t.leaveQueue}
          </Button>
        ) : alreadyHere ? (
          <Button
            className="w-full h-14 text-base font-semibold rounded-xl"
            onClick={() => {
              onViewQueue?.()
              navigateTo("my-queue")
            }}
          >
            {t.myQueue}
          </Button>
        ) : (
          <Button
            className={cn(
              "w-full h-14 text-base font-semibold rounded-xl shadow-lg",
              isEmergency && "bg-[#EF4444] hover:bg-red-600",
              isFastTrack && "bg-[#F59E0B] hover:bg-amber-600"
            )}
            disabled={!canJoin}
            onClick={() => void handleJoin()}
          >
            {joining
              ? "Joining…"
              : canLeaveToJoin
                ? t.leaveCurrentJoinHere
                : isEmergency
                  ? t.joinAsEmergency
                  : isFastTrack
                    ? t.joinAsPriority
                    : t.joinQueue}
          </Button>
        )}
      </div>
    </div>
  )
}
