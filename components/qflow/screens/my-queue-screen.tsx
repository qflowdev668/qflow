"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { UserScreenLayout } from "@/components/qflow/user-screen-layout"
import { EmptyQueueScene } from "@/components/qflow/illustrations/queue-scenes"
import { useOfflineStatus } from "@/components/qflow/offline-banner"
import { Button } from "@/components/ui/button"
import { AVG_SERVICE_MINUTES, ACTIVE_STAFF } from "@/lib/supabase/helpers"
import { isAboutToBeCalled } from "@/lib/queue-next-state"
import { MapPin, Clock, AlertCircle, Building2, XCircle, WifiOff, Bell, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ABOVE_BOTTOM_NAV } from "@/lib/bottom-chrome"

const isToday = (date: Date) => {
  const now = new Date()
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

export function MyQueueScreen() {
  const { activeQueue, leaveQueue, navigateTo, accessibility, queueHistory, lastSyncedAt } = useApp()
  const t = useT()
  const isOffline = useOfflineStatus()
  const reduceMotion = useReducedMotion()
  const [showOfflineTooltip, setShowOfflineTooltip] = useState(false)
  const [simpleViewActive, setSimpleViewActive] = useState(
    () => accessibility.simplifiedMode
  )
  const [noShowDismissed, setNoShowDismissed] = useState(false)
  const [pushGranted, setPushGranted] = useState(true)
  /** One-time tip dismissal keyed to queue_entry id (same session only). */
  const [dismissedNextTips, setDismissedNextTips] = useState<Record<string, true>>({})

  // Keep big-text view in sync when Simple mode is toggled from Accessibility.
  useEffect(() => {
    if (accessibility.simplifiedMode) setSimpleViewActive(true)
  }, [accessibility.simplifiedMode])

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushGranted(false)
      return
    }
    setPushGranted(Notification.permission === "granted")
  }, [])

  const isLargeText = accessibility.textSize === "large" || accessibility.textSize === "x-large"

  const latestVisit = queueHistory[0]
  const wasMarkedNoShow =
    !!latestVisit && latestVisit.status === "no-show" && isToday(latestVisit.date)
  const noShowsToday = queueHistory.filter(
    (visit) => visit.status === "no-show" && isToday(visit.date)
  ).length

  // Show no-show notice if the user's last visit today ended as a no-show
  if (!activeQueue && wasMarkedNoShow && !noShowDismissed) {
    return (
      <div className="min-h-screen bg-background flex flex-col" style={{ paddingBottom: ABOVE_BOTTOM_NAV }}>
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4">
                  <h1 className="text-xl font-bold text-foreground">{t.myQueue}</h1>
        </header>

        <div className="flex-1 px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[#EF4444] mb-2">You Were Marked as No-Show</h2>
                <div className="text-sm text-red-700 space-y-2">
                  <p>
                    Your turn was called at{" "}
                    <strong>
                      {latestVisit.date.toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>{" "}
                    but you did not arrive in time.
                  </p>
                  <p>
                    You have been removed from the queue at <strong>{latestVisit.locationName}</strong>.
                  </p>
                  {noShowsToday > 1 && (
                    <p className="font-medium">No-shows today: {noShowsToday}</p>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <Button onClick={() => setNoShowDismissed(true)} className="w-full h-12">
                    Rejoin a Queue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNoShowDismissed(true)
                      navigateTo("home")
                    }}
                    className="w-full h-12"
                  >
                    Find Other Location
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    )
  }

  if (!activeQueue) {
    return (
      <>
        <UserScreenLayout
          illustration={<EmptyQueueScene className="w-full h-auto" />}
          title={t.noActiveQueue}
          subtitle={t.noActiveQueueHint}
          footer={
            <Button onClick={() => navigateTo("home")} className="w-full h-14 text-base font-bold rounded-2xl">
              {t.findALocation}
            </Button>
          }
        />
        <BottomNav />
      </>
    )
  }

  const peopleAhead = Math.max(activeQueue.position - 1, 0)
  const estimatedWait = activeQueue.estimatedWait
  // Pre-call state: #1, still waiting — not Flow Bar's your-turn / serving urgency.
  const aboutToBeCalled = isAboutToBeCalled(activeQueue)
  const showNextTip = aboutToBeCalled && !dismissedNextTips[activeQueue.id]

  // Circular progress: how far the user has moved up the queue they joined
  const totalInQueue = Math.max(activeQueue.totalInQueue, activeQueue.position)
  const progress = ((totalInQueue - activeQueue.position + 1) / totalInQueue) * 100
  const circumference = 2 * Math.PI * 70
  const strokeDashoffset = circumference - (progress / 100) * circumference

  if (simpleViewActive) {
    return (
      <SimpleQueueView
        position={activeQueue.position}
        waitTime={estimatedWait}
        locationName={activeQueue.locationName}
        onLeave={leaveQueue}
        onSwitchToNormal={() => setSimpleViewActive(false)}
        aboutToBeCalled={aboutToBeCalled}
        showNextTip={showNextTip}
        onDismissNextTip={() =>
          setDismissedNextTips((prev) => ({ ...prev, [activeQueue.id]: true }))
        }
        reduceMotion={!!reduceMotion}
      />
    )
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: ABOVE_BOTTOM_NAV }}
      data-testid="queue-status-screen"
      data-about-to-be-called={aboutToBeCalled ? "true" : "false"}
    >
      {/* Status Banner */}
      <div
        className={cn(
          "border-b px-4 py-4",
          aboutToBeCalled
            ? "bg-amber-100 border-amber-300"
            : "bg-secondary/10 border-secondary/20"
        )}
        data-testid="queue-status-banner"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              aboutToBeCalled ? "bg-amber-600" : "bg-secondary",
              !reduceMotion && (aboutToBeCalled ? "flowbar-pulse" : "animate-pulse")
            )}
            aria-hidden
          />
          <p
            className={cn(
              "font-semibold",
              aboutToBeCalled ? "text-amber-950" : "text-foreground"
            )}
          >
            {aboutToBeCalled ? (
              t.youreNext
            ) : (
              <>
                {t.youreInQueue} —{" "}
                <span className="text-secondary">
                  {peopleAhead} {peopleAhead === 1 ? t.personAheadLabel : t.peopleAheadLabel}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {showNextTip && (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-3"
          data-testid="about-to-be-called-tip"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-amber-950">
              {t.aboutToBeCalledTip}
            </p>
            <button
              type="button"
              aria-label={t.dismissTip}
              className="shrink-0 rounded-md p-1 text-amber-800 hover:bg-amber-100"
              onClick={() =>
                setDismissedNextTips((prev) => ({ ...prev, [activeQueue.id]: true }))
              }
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!pushGranted && (
        <div
          className="sticky top-0 z-30 bg-amber-50 border-b border-amber-300 px-4 py-3"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <Bell className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">{t.keepTabOpenForTurn}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 py-6">
        {/* Large Position Number with Circular Progress */}
        <div className="flex flex-col items-center mb-8">
          <div
            className={cn(
              "relative mb-4 h-48 w-48",
              aboutToBeCalled && !reduceMotion && "qflow-next-ring",
              aboutToBeCalled && reduceMotion && "ring-4 ring-amber-400/50 rounded-full"
            )}
            data-testid="queue-place-ring"
            data-pulse={aboutToBeCalled && !reduceMotion ? "true" : "false"}
          >
            <svg className="h-full w-full -rotate-90 transform">
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className={aboutToBeCalled ? "text-amber-200" : "text-muted"}
              />
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-500",
                  aboutToBeCalled ? "text-amber-600" : "text-primary"
                )}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                {t.position}
              </p>
              <p
                className={cn(
                  "font-bold text-foreground transition-all",
                  isLargeText ? "text-[96px]" : "text-6xl"
                )}
              >
                #{activeQueue.position}
              </p>
            </div>
          </div>

          {/* Estimated Wait Card */}
          <div
            className={cn(
              "w-full max-w-xs rounded-2xl border bg-card p-4 text-center shadow-sm",
              aboutToBeCalled ? "border-amber-300" : "border-border",
              isLargeText && "p-6"
            )}
          >
            <p
              className={cn(
                "mb-1 uppercase tracking-wide text-muted-foreground",
                isLargeText ? "text-sm" : "text-xs"
              )}
            >
              {isLargeText ? t.waitLabel : t.estimatedWait}
            </p>
            {aboutToBeCalled && estimatedWait <= 0 ? (
              <p
                className="mb-1 text-3xl font-bold text-amber-700"
                data-testid="any-moment-now"
              >
                {t.anyMomentNow}
              </p>
            ) : (
              <>
                <p className="mb-1 text-5xl font-bold text-primary">~{estimatedWait} min</p>
                <p className="text-xs italic text-muted-foreground">
                  {isOffline ? "(paused — you're offline)" : "(updating live)"}
                </p>
              </>
            )}

            <div className="mt-4 border-t border-border pt-3 text-left">
              <p className="mb-2 text-xs text-muted-foreground">Based on:</p>
              <ul className={cn("space-y-1 text-foreground", isLargeText ? "text-lg" : "text-sm")}>
                <li>
                  • {peopleAhead}{" "}
                  {isLargeText ? "AHEAD OF YOU" : "people ahead of you"}
                </li>
                {!isLargeText && <li>• Avg service time: {AVG_SERVICE_MINUTES} min</li>}
                {!isLargeText && <li>• {ACTIVE_STAFF} counters serving</li>}
              </ul>
            </div>
          </div>

          {/* Offline Last Updated */}
          {isOffline && (
            <div className="mt-3 text-center">
              {lastSyncedAt && (
                <p className="text-sm text-muted-foreground italic">
                  <Clock className="mr-1 inline h-4 w-4" />
                  Last updated:{" "}
                  {lastSyncedAt.toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                (Updates paused — you&apos;re offline)
              </p>
            </div>
          )}
        </div>

        {/* Location Info Card */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{activeQueue.locationName}</h3>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{activeQueue.locationAddress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Info Card */}
        {isOffline && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold">Offline Mode</span> — Showing your last known position. Your spot is held. Connect to get live updates.
              </p>
            </div>
          </div>
        )}

        {/* Live Pulse Indicator */}
        {!isOffline && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-success"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            <span>{t.liveUpdates}</span>
          </div>
        )}

        {/* Red Outlined Leave Queue Button - Disabled when offline */}
        <div className="relative mb-3">
          <Button 
            variant="outline"
            onClick={isOffline ? () => setShowOfflineTooltip(true) : leaveQueue}
            className={cn(
              "w-full text-base font-semibold border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl",
              isLargeText ? "h-16 text-lg" : "h-14",
              isOffline && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-destructive"
            )}
          >
            <AlertCircle className={cn("mr-2", isLargeText ? "w-6 h-6" : "w-5 h-5")} />
            {t.leaveQueue}
          </Button>
          
          {/* Offline Tooltip */}
          {isOffline && showOfflineTooltip && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-foreground text-background text-sm p-3 rounded-xl shadow-lg z-50">
              <p>Cannot leave queue while offline. Reconnect to update your status.</p>
              <button 
                onClick={() => setShowOfflineTooltip(false)}
                className="mt-2 text-xs text-background/70 underline"
              >
                Dismiss
              </button>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={() => setSimpleViewActive(true)}
          className={cn(
            "w-full text-base font-semibold rounded-xl",
            isLargeText ? "h-16 text-lg" : "h-14"
          )}
        >
          {t.switchToSimpleView}
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}

// Big-text / accessibility view — same aboutToBeCalled signal as the normal view.
function SimpleQueueView({
  position,
  waitTime,
  locationName,
  onLeave,
  onSwitchToNormal,
  aboutToBeCalled = false,
  showNextTip = false,
  onDismissNextTip,
  reduceMotion = false,
}: {
  position: number
  waitTime: number
  locationName: string
  onLeave: () => void
  onSwitchToNormal: () => void
  aboutToBeCalled?: boolean
  showNextTip?: boolean
  onDismissNextTip?: () => void
  reduceMotion?: boolean
}) {
  const t = useT()
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col px-6",
        aboutToBeCalled ? "bg-amber-50" : "bg-white"
      )}
      data-testid="queue-simple-view"
      data-about-to-be-called={aboutToBeCalled ? "true" : "false"}
    >
      {showNextTip && (
        <div
          className="mt-4 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-4"
          data-testid="about-to-be-called-tip"
          role="status"
        >
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 text-lg font-medium leading-snug text-amber-950">
              {t.aboutToBeCalledTip}
            </p>
            <button
              type="button"
              aria-label={t.dismissTip}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-amber-900 hover:bg-amber-200"
              onClick={onDismissNextTip}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center">
        <p
          className={cn(
            "mb-4 text-sm uppercase tracking-widest",
            aboutToBeCalled ? "font-semibold text-amber-800" : "text-muted-foreground"
          )}
        >
          {aboutToBeCalled ? t.youreNext : t.yourNumber}
        </p>
        <p
          className={cn(
            "mb-6 text-[96px] font-bold leading-none",
            aboutToBeCalled ? "text-amber-900" : "text-foreground",
            aboutToBeCalled && !reduceMotion && "qflow-next-ring",
            aboutToBeCalled && reduceMotion && "rounded-lg ring-4 ring-amber-400/60"
          )}
          data-testid="queue-simple-number"
          data-pulse={aboutToBeCalled && !reduceMotion ? "true" : "false"}
        >
          #{position}
        </p>
        {aboutToBeCalled ? (
          <p
            className="mb-4 text-3xl font-bold uppercase tracking-wide text-amber-800"
            data-testid="any-moment-now"
          >
            {t.anyMomentNow}
          </p>
        ) : (
          <p className="mb-4 text-2xl font-bold uppercase text-foreground">
            {t.waitLabel}: {waitTime} {t.minutes}
          </p>
        )}
        <p
          className={cn(
            "text-center text-base",
            aboutToBeCalled ? "text-amber-900/80" : "text-muted-foreground"
          )}
        >
          {locationName}
        </p>
      </div>

      <div className="w-full space-y-3 pb-8">
        <Button
          type="button"
          onClick={onLeave}
          className="h-16 w-full rounded-2xl bg-foreground text-xl font-semibold text-background hover:bg-foreground/90"
        >
          {t.leaveQueue.toUpperCase()}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSwitchToNormal}
          className={cn(
            "h-14 w-full rounded-xl border-2 text-base font-semibold",
            aboutToBeCalled && "border-amber-400 bg-amber-100/80 text-amber-950 hover:bg-amber-100"
          )}
        >
          {t.switchToNormalView}
        </Button>
      </div>
    </div>
  )
}
