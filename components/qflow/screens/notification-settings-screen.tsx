"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
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

  const handleTogglePush = async (on: boolean) => {
    if (on && "Notification" in window && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      setPushEnabled(permission === "granted")
      return
    }
    setPushEnabled(on)
  }

  const handleSavePreferences = () => {
    setShowSavedToast(true)
    setTimeout(() => {
      setShowSavedToast(false)
      navigateTo("profile")
    }, 1500)
  }

  const userName = currentUser?.name.split(" ")[0] ?? "there"
  const previewText = activeQueue
    ? t.smsPreviewWithQueue
        .replace("{name}", userName)
        .replace("{position}", String(activeQueue.position))
        .replace("{location}", activeQueue.locationName)
        .replace("{wait}", String(activeQueue.estimatedWait))
    : t.smsPreviewTurnSoon.replace("{name}", userName)

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={t.notificationSettings} showBack backTo="profile" />

      <div className="px-4 py-6 space-y-6">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">{t.pushNotifications}</span>
            <Switch
              checked={pushEnabled}
              onCheckedChange={(on) => void handleTogglePush(on)}
              disabled={pushPermission === "denied"}
            />
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                pushPermission === "granted" ? "bg-[#10B981]" : "bg-[#EF4444]"
              )}
            />
            {pushPermission === "granted" ? t.enabledOnDevice : t.blockedInBrowser}
          </p>
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

          <div className="bg-card border border-border rounded-2xl p-4 max-w-[280px] shadow-sm">
            <p className="text-xs font-semibold text-primary mb-1">QFlow</p>
            <p className="text-foreground text-sm leading-relaxed">{previewText}</p>
          </div>

          <p className="text-xs text-gray-500 text-center italic mt-3">{t.smsPreviewNote}</p>
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
