"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { useChromeInsets } from "@/hooks/use-chrome-insets"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { syncPushSubscription, unsubscribePush } from "@/lib/web-push"
import type { NotificationPreferences } from "@/lib/notification-prefs"

export function NotificationSettingsScreen() {
  const {
    navigateTo,
    currentUser,
    activeQueue,
    notificationPreferences,
    setNotificationPreferences,
  } = useApp()
  const t = useT()

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushPermission, setPushPermission] = useState<"granted" | "denied" | "default">(
    "default"
  )
  const [pushBusy, setPushBusy] = useState(false)

  const [notify5Away, setNotify5Away] = useState(notificationPreferences.notify5Away)
  const [notify2Away, setNotify2Away] = useState(notificationPreferences.notify2Away)
  const [notifyTurn, setNotifyTurn] = useState(notificationPreferences.notifyTurn)
  const [notifyFaster, setNotifyFaster] = useState(notificationPreferences.notifyFaster)
  const [notifyPaused, setNotifyPaused] = useState(notificationPreferences.notifyPaused)

  const [showSavedToast, setShowSavedToast] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission)
      setPushEnabled(Notification.permission === "granted")
    }
  }, [])

  useEffect(() => {
    setNotify5Away(notificationPreferences.notify5Away)
    setNotify2Away(notificationPreferences.notify2Away)
    setNotifyTurn(notificationPreferences.notifyTurn)
    setNotifyFaster(notificationPreferences.notifyFaster)
    setNotifyPaused(notificationPreferences.notifyPaused)
  }, [
    notificationPreferences.notify5Away,
    notificationPreferences.notify2Away,
    notificationPreferences.notifyTurn,
    notificationPreferences.notifyFaster,
    notificationPreferences.notifyPaused,
  ])

  const handleTogglePush = async (on: boolean) => {
    setPushBusy(true)
    try {
      if (on) {
        const result = await syncPushSubscription({ requestPermission: true })
        if (result === "granted") {
          setPushPermission("granted")
          setPushEnabled(true)
        } else if (result === "denied") {
          setPushPermission("denied")
          setPushEnabled(false)
        } else {
          setPushPermission("default")
          setPushEnabled(false)
        }
      } else {
        await unsubscribePush()
        setPushEnabled(false)
      }
    } finally {
      setPushBusy(false)
    }
  }

  const handleSavePreferences = async () => {
    setSaveError(null)
    const prefs: NotificationPreferences = {
      notify5Away,
      notify2Away,
      notifyTurn,
      notifyFaster,
      notifyPaused,
    }
    const ok = await setNotificationPreferences(prefs)
    if (!ok) {
      setSaveError("Could not save alert settings.")
      return
    }
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

  const { paddingBottom } = useChromeInsets()

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom }}
      data-testid="notification-settings"
    >
      <TopBar title={t.notificationSettings} showBack backTo="profile" />

      <div className="space-y-6 px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-foreground">{t.pushNotifications}</span>
            <Switch
              checked={pushEnabled}
              onCheckedChange={(on) => void handleTogglePush(on)}
              disabled={pushPermission === "denied" || pushBusy}
              data-testid="phone-alerts-switch"
            />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                pushPermission === "granted" ? "bg-[#10B981]" : "bg-[#EF4444]"
              )}
            />
            {pushPermission === "granted" ? t.enabledOnDevice : t.blockedInBrowser}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-4 font-medium text-foreground">{t.notifyMeWhen}</p>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={notify5Away}
                onChange={(e) => setNotify5Away(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                data-testid="pref-5-away"
              />
              <span className="text-foreground">{t.fivePeopleAway}</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={notify2Away}
                onChange={(e) => setNotify2Away(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                data-testid="pref-2-away"
              />
              <span className="text-foreground">{t.twoPeopleAway}</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={notifyTurn}
                onChange={(e) => setNotifyTurn(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                data-testid="pref-my-turn"
              />
              <span className="text-foreground">{t.itsMyTurn}</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={notifyFaster}
                onChange={(e) => setNotifyFaster(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                data-testid="pref-faster"
              />
              <span className="text-foreground">{t.queueMovingFaster}</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={notifyPaused}
                onChange={(e) => setNotifyPaused(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                data-testid="pref-paused"
              />
              <span className="text-foreground">{t.servicePaused}</span>
            </label>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm text-muted-foreground">{t.smsPreview}</p>

          <div className="max-w-[280px] rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-1 text-xs font-semibold text-primary">QFlow</p>
            <p className="text-sm leading-relaxed text-foreground">{previewText}</p>
          </div>

          <p className="mt-3 text-center text-xs italic text-muted-foreground">
            {t.smsPreviewNote}
          </p>
        </div>

        {saveError && (
          <p className="text-sm text-destructive" role="alert">
            {saveError}
          </p>
        )}

        <Button
          type="button"
          onClick={() => void handleSavePreferences()}
          className="h-[52px] w-full bg-[#2563EB] hover:bg-[#2563EB]/90"
          data-testid="save-notification-prefs"
        >
          {t.savePreferences}
        </Button>
      </div>

      {showSavedToast && (
        <div
          className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-qflow -translate-x-1/2 rounded-xl bg-[#10B981] p-4 text-white shadow-lg animate-in slide-in-from-bottom"
          style={{ bottom: paddingBottom }}
          data-testid="notif-saved-toast"
        >
          <p className="text-center font-medium">{t.preferencesSaved}</p>
        </div>
      )}
    </div>
  )
}
