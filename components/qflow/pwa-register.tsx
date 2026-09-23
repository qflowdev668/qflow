"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { syncPushSubscription } from "@/lib/web-push"

async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  } catch {
    return null
  }
}

/** Registers the service worker and syncs Web Push for signed-in users. */
export function PwaRegister() {
  const { isAuthenticated, isAuthLoading, currentUser } = useApp()

  useEffect(() => {
    void registerServiceWorker()
  }, [])

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !currentUser) return
    if (currentUser.role !== "user") return
    // Only sync if permission already granted — never re-prompt on every load.
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      void syncPushSubscription({ requestPermission: false })
    }
  }, [isAuthLoading, isAuthenticated, currentUser])

  return null
}
