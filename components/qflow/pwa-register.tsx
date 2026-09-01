"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { apiFetch } from "@/lib/api-client"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  } catch {
    return null
  }
}

async function syncPushSubscription() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey || !("PushManager" in window) || !("Notification" in window)) return

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : Notification.permission === "denied"
        ? "denied"
        : await Notification.requestPermission()

  if (permission !== "granted") return

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  await apiFetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  })
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
    void syncPushSubscription()
  }, [isAuthLoading, isAuthenticated, currentUser])

  return null
}
