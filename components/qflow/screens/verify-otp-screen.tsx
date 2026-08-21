"use client"

import { Suspense, useEffect, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TopBar } from "@/components/qflow/top-bar"
import { useResetTokenSession } from "@/components/qflow/use-reset-token-session"

function VerifyOtpForm() {
  const {
    verifyPasswordResetOtp,
    startPasswordReset,
    navigateTo,
    authError,
    clearAuthError,
  } = useApp()
  const t = useT()
  const { rt, session, loading, error: tokenError, router } = useResetTokenSession()
  const [otp, setOtp] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!rt || tokenError || !session) {
      navigateTo("forgot-password")
    } else if (session.stage === "verified") {
      router.replace(`/forgot-password/reset?rt=${encodeURIComponent(rt)}`)
    }
  }, [loading, rt, tokenError, session, navigateTo, router])

  const email = session?.email

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !rt) return
    clearAuthError()
    setInfo(null)
    setIsSubmitting(true)
    await verifyPasswordResetOtp(otp, email, rt)
    setIsSubmitting(false)
  }

  const handleResend = async () => {
    if (!email) return
    clearAuthError()
    setInfo(null)
    setIsResending(true)
    const result = await startPasswordReset(email)
    setIsResending(false)
    if (result === "sent") {
      setInfo(t.newCodeSent)
    }
  }

  if (loading || !email || !rt) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center text-sm text-muted-foreground">
        {t.verifying}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar title={t.enterOtp} showBack backTo="forgot-password" />

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        <p className="text-sm text-muted-foreground">
          {t.otpSentToEmail.replace("{email}", email)}
        </p>

        {(authError || info || tokenError) && (
          <div
            className={`p-3 rounded-lg text-sm ${
              authError || tokenError
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-foreground"
            }`}
          >
            {authError || tokenError || info}
          </div>
        )}

        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          placeholder={t.sixDigitCode}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="h-14 text-center text-2xl tracking-[0.25em] font-semibold"
          required
          autoComplete="one-time-code"
        />

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting || otp.length < 6}
        >
          {isSubmitting ? t.verifying : t.verifyCode}
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || !email}
          className="w-full text-sm text-primary font-medium disabled:opacity-50"
        >
          {isResending ? t.sending : t.resendCode}
        </button>

        <button
          type="button"
          onClick={() => navigateTo("login")}
          className="w-full text-sm text-muted-foreground"
        >
          {t.backToLogin}
        </button>
      </form>
    </div>
  )
}

export function VerifyOtpScreen() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-background flex items-center justify-center text-sm text-muted-foreground">
          …
        </div>
      }
    >
      <VerifyOtpForm />
    </Suspense>
  )
}
