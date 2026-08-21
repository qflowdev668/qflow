"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export function NotificationSettingsScreen() {
  const { navigateTo, currentUser, activeQueue } = useApp()
  const t = useT()
  
  const [pushEnabled, setPushEnabled] = useState(true)
  const [pushPermission, setPushPermission] = useState<"granted" | "denied" | "default">("default")
  
  const [notify5Away, setNotify5Away] = useState(true)
  const [notify2Away, setNotify2Away] = useState(true)
  const [notifyTurn, setNotifyTurn] = useState(true)
  const [notifyFaster, setNotifyFaster] = useState(false)
  const [notifyPaused, setNotifyPaused] = useState(false)
  
  const [showSavedToast, setShowSavedToast] = useState(false)

  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission)
      setPushEnabled(Notification.permission === "granted")
    }
  }, [])

  const handleSavePreferences = () => {
    setShowSavedToast(true)
    setTimeout(() => {
      setShowSavedToast(false)
      navigateTo("profile")
    }, 1500)
  }

  const userName = currentUser?.name.split(" ")[0] ?? "there"

  const smsPreviewText = activeQueue
    ? t.smsPreviewWithQueue
        .replace("{name}", userName)
        .replace("{position}", String(activeQueue.position))
        .replace("{location}", activeQueue.locationName)
        .replace("{wait}", String(activeQueue.estimatedWait))
    : t.smsPreviewTurnSoon.replace("{name}", userName)

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        title={t.notificationSettings} 
        showBack 
        backTo="profile"
      />

      <div className="px-4 py-6 space-y-6">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">{t.pushNotifications}</span>
            <Switch
              checked={pushEnabled}
              onCheckedChange={setPushEnabled}
              disabled={pushPermission === "denied"}
            />
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <span className={cn(
              "w-2 h-2 rounded-full",
              pushPermission === "granted" ? "bg-[#10B981]" : "bg-[#EF4444]"
            )} />
            {pushPermission === "granted" 
              ? t.enabledOnDevice 
              : t.blockedInBrowser}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 opacity-70">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{t.smsAlerts}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {t.comingSoon}
              </span>
            </div>
            <Switch checked={false} disabled />
          </div>
          <p className="text-sm text-muted-foreground">
            {t.smsNotAvailableYet}
          </p>

          <div className="mt-3">
            <label htmlFor="sms-number" className="text-sm text-muted-foreground mb-1 block">
              {t.cellNumber}
            </label>
            <Input
              id="sms-number"
              type="tel"
              value=""
              readOnly
              disabled
              placeholder="+27 82 xxx xxxx"
              className="h-10"
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="font-medium text-foreground mb-4">{t.notifyMeWhen}</p>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notify5Away}
                onChange={(e) => setNotify5Away(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span className="text-foreground">{t.fivePeopleAway}</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notify2Away}
                onChange={(e) => setNotify2Away(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span className="text-foreground">{t.twoPeopleAway}</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyTurn}
                onChange={(e) => setNotifyTurn(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span className="text-foreground">{t.itsMyTurn}</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyFaster}
                onChange={(e) => setNotifyFaster(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span className="text-foreground">{t.queueMovingFaster}</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyPaused}
                onChange={(e) => setNotifyPaused(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <span className="text-foreground">{t.servicePaused}</span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-3">{t.smsPreview}</p>
          
          <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[280px]">
            <p className="text-foreground text-sm leading-relaxed">
              {smsPreviewText}
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center italic mt-3">
            {t.smsPreviewNote}
          </p>
        </div>

        <Button
          onClick={handleSavePreferences}
          className="w-full h-[52px] bg-[#2563EB] hover:bg-[#2563EB]/90"
        >
          {t.savePreferences}
        </Button>
      </div>

      {showSavedToast && (
        <div className="fixed bottom-6 left-4 right-4 bg-[#10B981] text-white rounded-xl p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
          <p className="text-center font-medium">{t.preferencesSaved}</p>
        </div>
      )}
    </div>
  )
}
