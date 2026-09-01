"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { UserScreenLayout } from "@/components/qflow/user-screen-layout"
import { EmptyQueueScene } from "@/components/qflow/illustrations/queue-scenes"
import { useOfflineStatus } from "@/components/qflow/offline-banner"
import { Button } from "@/components/ui/button"
import { AVG_SERVICE_MINUTES, ACTIVE_STAFF } from "@/lib/supabase/helpers"
import { MapPin, Clock, AlertCircle, Building2, XCircle, WifiOff, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [showOfflineTooltip, setShowOfflineTooltip] = useState(false)
  const [simpleViewActive, setSimpleViewActive] = useState(false)
  const [noShowDismissed, setNoShowDismissed] = useState(false)
  const [pushGranted, setPushGranted] = useState(true)

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
      <div className="min-h-screen bg-background flex flex-col pb-20">
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

  const peopleAhead = activeQueue.position - 1
  const estimatedWait = activeQueue.estimatedWait

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
      />
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Status Banner */}
      <div className="bg-secondary/10 border-b border-secondary/20 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse" />
          <p className="text-foreground font-semibold">
            {t.youreInQueue} —{" "}
            <span className="text-secondary">
              {peopleAhead} {peopleAhead === 1 ? t.personAheadLabel : t.peopleAheadLabel}
            </span>
          </p>
        </div>
      </div>

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
          <div className="relative w-48 h-48 mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className="transition-all duration-500 text-primary"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t.position}</p>
              <p className={cn(
                "font-bold text-foreground transition-all",
                isLargeText ? "text-[96px]" : "text-6xl"
              )}>
                #{activeQueue.position}
              </p>
            </div>
          </div>

          {/* Estimated Wait Card */}
          <div className={cn(
            "bg-card rounded-2xl border border-border shadow-sm p-4 w-full max-w-xs",
            isLargeText && "p-6"
          )}>
            <p className={cn(
              "text-muted-foreground uppercase tracking-wide mb-1",
              isLargeText ? "text-sm" : "text-xs"
            )}>
                      {isLargeText ? t.waitLabel : t.estimatedWait}
            </p>
            <p className="text-5xl font-bold text-primary mb-1">~{estimatedWait} min</p>
            <p className="text-xs text-muted-foreground italic">
              {isOffline ? "(paused — you're offline)" : "(updating live)"}
            </p>

            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Based on:</p>
              <ul className={cn("text-foreground space-y-1", isLargeText ? "text-lg" : "text-sm")}>
                <li>• {peopleAhead} {isLargeText ? "AHEAD OF YOU" : "people ahead of you"}</li>
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
                  <Clock className="w-4 h-4 inline mr-1" />
                  Last updated:{" "}
                  {lastSyncedAt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
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
        <div className="relative">
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
            "w-full mt-3 text-base font-semibold rounded-xl",
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

// Simplified View Component - Part C
function SimpleQueueView({ 
  position, 
  waitTime, 
  locationName, 
  onLeave, 
  onSwitchToNormal 
}: { 
  position: number
  waitTime: number
  locationName: string
  onLeave: () => void
  onSwitchToNormal: () => void
}) {
  const t = useT()
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground tracking-widest uppercase mb-4">{t.yourNumber}</p>
        <p className="text-[96px] font-bold text-foreground leading-none mb-6">#{position}</p>
        <p className="text-2xl font-bold text-foreground mb-4">
          {t.waitLabel}: {waitTime} {t.minutes}
        </p>
        <p className="text-base text-muted-foreground">{locationName}</p>
      </div>

      <div className="w-full pb-8 space-y-3">
        <Button
          type="button"
          onClick={onLeave}
          className="w-full h-16 bg-foreground text-background text-xl font-semibold rounded-2xl hover:bg-foreground/90"
        >
          {t.leaveQueue.toUpperCase()}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSwitchToNormal}
          className="w-full h-14 text-base font-semibold rounded-xl border-2"
        >
          {t.switchToNormalView}
        </Button>
      </div>
    </div>
  )
}
