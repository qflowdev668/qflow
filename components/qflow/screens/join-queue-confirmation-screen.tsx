"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import type { TranslationKeys } from "@/lib/i18n"
import { estimateWait } from "@/lib/supabase/helpers"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Users, CheckCircle2, Bell, Shield, Siren, Flame, Car, Medal, Backpack, Baby, Accessibility, UserCircle, HeartPulse, BellRing } from "lucide-react"
import { cn } from "@/lib/utils"

type PriorityCategory = 
  | "police" | "paramedic" | "firefighter" | "traffic" | "military"
  | "learner" | "pregnant" | "disability" | "elderly" | "infant" | "distress"
  | null

const emergencyCategoryIds = ["police", "paramedic", "firefighter", "traffic", "military"] as const
const fastTrackCategoryIds = ["learner", "pregnant", "disability", "elderly", "infant", "distress"] as const

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

function getPriorityLabel(t: TranslationKeys, id: Exclude<PriorityCategory, null>) {
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

export function JoinQueueConfirmationScreen() {
  const {
    joinQueue,
    navigateTo,
    selectedLocation,
    authError,
    clearAuthError,
  } = useApp()
  const t = useT()
  const [selectedPriority, setSelectedPriority] = useState<PriorityCategory>(null)
  const [notificationState, setNotificationState] = useState<"ask" | "granted" | "skipped">("ask")
  const [joining, setJoining] = useState(false)
  const location = selectedLocation

  useEffect(() => {
    clearAuthError()
  }, [clearAuthError])

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission === "granted") {
      setNotificationState("granted")
    } else if (Notification.permission === "denied") {
      setNotificationState("skipped")
    }
  }, [])

  const position = (location?.queueCount ?? 0) + 1
  const estimatedWait = estimateWait(position - 1)

  const isEmergency = selectedPriority && emergencyCategoryIds.some(c => c === selectedPriority)
  const isFastTrack = selectedPriority && fastTrackCategoryIds.some(c => c === selectedPriority)

  const handleConfirm = async () => {
    if (!location || joining) return
    clearAuthError()
    setJoining(true)
    try {
      const type = isEmergency ? "emergency" : isFastTrack ? "fast-track" : "standard"
      const label = selectedPriority ? getPriorityLabel(t, selectedPriority) : undefined
      await joinQueue(location, { type, category: label })
    } finally {
      setJoining(false)
    }
  }

  const handleCancel = () => {
    navigateTo("location-detail")
  }

  const handleSelectPriority = (id: PriorityCategory) => {
    setSelectedPriority(selectedPriority === id ? null : id)
  }

  const handleAllowNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setNotificationState("granted")
        return
      }
    }
    setNotificationState("skipped")
  }

  const handleNoThanks = () => {
    setNotificationState("skipped")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar 
        title={t.joinQueueTitle} 
        showBack 
        backTo="location-detail"
      />

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{location?.name ?? t.noLocationSelected}</h2>
            <p className="text-sm text-muted-foreground">{location?.address ?? t.goBackPickLocation}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
          <div
            className={cn(
              "px-4 py-4 text-center text-white",
              isEmergency ? "bg-[#EF4444]" : isFastTrack ? "bg-[#F59E0B]" : "bg-primary"
            )}
          >
            <p className="text-sm opacity-90 mb-1">
              {selectedPriority ? t.youWillBePlaced : t.yourPositionWhenJoin}
            </p>
            <p className="text-5xl font-bold">
              {isEmergency ? t.first : isFastTrack ? t.nearFront : `#${position}`}
            </p>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-muted-foreground">{t.estimatedWait}</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                {selectedPriority ? t.shorter : `${estimatedWait} ${t.minUnit}`}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground">
                  {selectedPriority ? t.peopleInQueue : t.peopleAheadShort}
                </span>
              </div>
              <span className="text-xl font-bold text-foreground">{position - 1}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 mb-6">
          <h3 className="text-base font-semibold text-foreground mb-2">{t.priorityStatus}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t.qualifyForPriority}</p>
          
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t.emergencyPriority}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {emergencyCategoryIds.map((id) => {
              const Icon = emergencyIcons[id]
              const isSelected = selectedPriority === id
              return (
                <button
                  key={id}
                  onClick={() => handleSelectPriority(id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px]",
                    isSelected
                      ? "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]"
                      : "border-border bg-card text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {getPriorityLabel(t, id)}
                </button>
              )
            })}
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t.fastTrackPriority}</p>
          <div className="flex flex-wrap gap-2">
            {fastTrackCategoryIds.map((id) => {
              const Icon = fastTrackIcons[id]
              const isSelected = selectedPriority === id
              return (
                <button
                  key={id}
                  onClick={() => handleSelectPriority(id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px]",
                    isSelected
                      ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-border bg-card text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {getPriorityLabel(t, id)}
                </button>
              )
            })}
          </div>
        </div>

        {notificationState === "ask" && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <BellRing className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">{t.getNotifiedWhenTurn}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t.allowNotificationsDesc}</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleAllowNotifications} className="rounded-xl">
                    {t.allowNotifications}
                  </Button>
                  <Button variant="outline" onClick={handleNoThanks} className="rounded-xl">
                    {t.skip}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {notificationState === "granted" && (
          <div className="bg-success/5 border border-success/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t.allowNotifications}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.notifiedThreeAway}
                </p>
              </div>
            </div>
          </div>
        )}

        {notificationState === "skipped" && (
          <div
            className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-6 sticky top-0 z-10"
            role="status"
          >
            <div className="flex items-start gap-3">
              <Bell className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">{t.notifications}</h3>
                <p className="text-sm text-amber-900 leading-relaxed">
                  {t.keepTabOpenForTurn}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl border-amber-400 text-amber-900"
                  onClick={() => void handleAllowNotifications()}
                >
                  {t.allowNotifications}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="bg-primary/5 rounded-xl p-4 flex gap-3">
            <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.queueMoveNotifications}
            </p>
          </div>
          <div className="bg-success/5 rounded-xl p-4 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.leaveQueueAnytime}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        {authError && (
          <p className="text-sm text-destructive text-center px-2" role="alert">
            {authError}
          </p>
        )}
        <Button 
          onClick={() => void handleConfirm()}
          disabled={!location || joining}
          className={cn(
            "w-full h-14 text-base font-semibold rounded-xl shadow-lg",
            isEmergency && "bg-[#EF4444] hover:bg-red-600 shadow-red-500/25",
            isFastTrack && "bg-[#F59E0B] hover:bg-amber-600 shadow-amber-500/25",
            !selectedPriority && "shadow-primary/25"
          )}
        >
          {joining
            ? "Joining…"
            : isEmergency
              ? t.joinAsEmergency
              : isFastTrack
                ? t.joinAsPriority
                : t.confirmAndJoin}
        </Button>
        <Button 
          variant="outline"
          onClick={handleCancel}
          disabled={joining}
          className="w-full h-12 text-base rounded-xl"
        >
          {t.cancel}
        </Button>
      </div>
    </div>
  )
}
