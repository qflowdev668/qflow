"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import type { TranslationKeys } from "@/lib/i18n"
import { estimateWait } from "@/lib/supabase/helpers"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Users, CheckCircle2, Bell, Shield, Siren, Flame, Car, Medal, Backpack, Baby, Accessibility, UserCircle, HeartPulse, BellRing, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
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
  const { joinQueue, navigateTo, selectedLocation } = useApp()
  const t = useT()
  const [selectedPriority, setSelectedPriority] = useState<PriorityCategory>(null)
  const [notificationState, setNotificationState] = useState<"ask" | "granted" | "sms">("ask")

  const location = selectedLocation

  const position = (location?.queueCount ?? 0) + 1
  const estimatedWait = estimateWait(position - 1)

  const isEmergency = selectedPriority && emergencyCategoryIds.some(c => c === selectedPriority)
  const isFastTrack = selectedPriority && fastTrackCategoryIds.some(c => c === selectedPriority)

  const handleConfirm = () => {
    if (!location) return

    const type = isEmergency ? "emergency" : isFastTrack ? "fast-track" : "standard"
    const label = selectedPriority ? getPriorityLabel(t, selectedPriority) : undefined

    joinQueue(location, { type, category: label })
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
      } else {
        setNotificationState("sms")
      }
    } else {
      setNotificationState("sms")
    }
  }

  const handleNoThanks = () => {
    setNotificationState("sms")
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
                      ? "bg-[#EF4444] border-[#EF4444] text-white" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
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
                      ? "bg-[#F59E0B] border-[#F59E0B] text-white" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {getPriorityLabel(t, id)}
                </button>
              )
            })}
          </div>

          {isEmergency && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EF4444] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-red-800 mb-1">{t.emergencyPriorityInfoTitle}</p>
                  <p className="text-sm text-red-700 leading-relaxed">
                    {t.emergencyPriorityInfo}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isFastTrack && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 mb-1">{t.fastTrackInfoTitle}</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    {t.fastTrackInfo}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {notificationState === "ask" && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Bell className="w-6 h-6 text-[#2563EB] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">{t.getNotifiedWhenTurn}</h3>
                <p className="text-sm text-gray-700 mb-4">
                  {t.allowNotificationsDesc}
                </p>
                <Button
                  onClick={handleAllowNotifications}
                  className="w-full h-11 bg-[#2563EB] hover:bg-[#2563EB]/90 mb-2"
                >
                  {t.allowNotifications}
                </Button>
                <button
                  onClick={handleNoThanks}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {t.noThanks}
                </button>
              </div>
            </div>
          </div>
        )}

        {notificationState === "granted" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <BellRing className="w-6 h-6 text-[#10B981] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-800">
                  {t.notifiedThreeAway}
                </p>
              </div>
            </div>
          </div>
        )}

        {notificationState === "sms" && (
          <div className="bg-muted/50 border border-border rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{t.getSmsInstead}</h3>
                  <span className="text-[11px] font-medium uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {t.comingSoon}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.smsNotAvailableDesc}
                </p>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted border border-border rounded-lg text-sm text-muted-foreground">
                    +27
                  </div>
                  <Input
                    type="tel"
                    value=""
                    readOnly
                    disabled
                    placeholder={t.smsPhonePlaceholder}
                    className="flex-1 h-11"
                  />
                </div>
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
        <Button 
          onClick={handleConfirm}
          disabled={!location}
          className={cn(
            "w-full h-14 text-base font-semibold rounded-xl shadow-lg",
            isEmergency && "bg-[#EF4444] hover:bg-red-600 shadow-red-500/25",
            isFastTrack && "bg-[#F59E0B] hover:bg-amber-600 shadow-amber-500/25",
            !selectedPriority && "shadow-primary/25"
          )}
        >
          {isEmergency ? t.joinAsEmergency : isFastTrack ? t.joinAsPriority : t.confirmAndJoin}
        </Button>
        <Button 
          variant="outline"
          onClick={handleCancel}
          className="w-full h-12 text-base rounded-xl"
        >
          {t.cancel}
        </Button>
      </div>
    </div>
  )
}
