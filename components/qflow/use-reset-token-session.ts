"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiFetch } from "@/lib/api-client"

type ResetSession = {
  email: string
  stage: "otp_sent" | "verified"
}

/** Loads password-reset flow state from `?rt=` (server-side token). */
export function useResetTokenSession() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rt = searchParams.get("rt")?.trim() || null
  const recovery = searchParams.get("recovery") === "1"
  const [session, setSession] = useState<ResetSession | null>(null)
  const [loading, setLoading] = useState(!!rt)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!rt) {
      setSession(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const res = await apiFetch(`/api/auth/reset/session?rt=${encodeURIComponent(rt)}`, {
          public: true,
        })
        const data = (await res.json().catch(() => ({}))) as {
          email?: string
          stage?: "otp_sent" | "verified"
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !data.email || !data.stage) {
          setSession(null)
          setError(data.error || "This reset link expired or is invalid.")
          setLoading(false)
          return
        }
        setSession({ email: data.email, stage: data.stage })
        setError(null)
      } catch {
        if (!cancelled) {
          setError("Could not load reset session.")
          setSession(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [rt])

  const goVerify = (token: string) => {
    router.replace(`/forgot-password/verify?rt=${encodeURIComponent(token)}`)
  }

  const goReset = (token: string) => {
    router.replace(`/forgot-password/reset?rt=${encodeURIComponent(token)}`)
  }

  return { rt, recovery, session, loading, error, goVerify, goReset, router }
}
