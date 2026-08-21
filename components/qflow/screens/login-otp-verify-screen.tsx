"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TopBar } from "@/components/qflow/top-bar"

export function LoginOtpVerifyScreen() {
  const {
    emailOtpEmail,
    emailOtpBackScreen,
    verifyEmailOtpLogin,
    startEmailOtpLogin,
    startAdminPhoneOtp,
    resendStaffLoginOtp,
    navigateTo,
    authError,
    clearAuthError,
  } = useApp()
  const t = useT()
  const [otp, setOtp] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [showStaffPasswordConfirm, setShowStaffPasswordConfirm] = useState(false)
  const [resendPassword, setResendPassword] = useState("")

  const isAdminFlow = emailOtpBackScreen === "admin-phone-otp"
  const isStaffFlow = emailOtpBackScreen === "staff-login"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setInfo(null)
    setIsSubmitting(true)
    await verifyEmailOtpLogin(otp)
    setIsSubmitting(false)
  }

  const handleResendClick = () => {
    clearAuthError()
    setInfo(null)
    if (isStaffFlow) {
      setShowStaffPasswordConfirm(true)
      setResendPassword("")
      return
    }
    void runResend()
  }

  const runResend = async (staffPassword?: string) => {
    clearAuthError()
    setInfo(null)
    setIsResending(true)
    let ok = false
    if (isAdminFlow) {
      const phone =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("qflow_admin_otp_phone") || ""
          : ""
      if (phone) ok = await startAdminPhoneOtp(phone)
    } else if (isStaffFlow) {
      ok = await resendStaffLoginOtp(staffPassword || "")
    } else if (emailOtpEmail) {
      ok = await startEmailOtpLogin(emailOtpEmail)
    }
    setIsResending(false)
    if (ok) {
      setInfo(t.newCodeSent)
      setShowStaffPasswordConfirm(false)
      setResendPassword("")
    }
  }

  const confirmStaffResend = async () => {
    if (!resendPassword.trim()) return
    await runResend(resendPassword)
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar title={t.enterLoginCode} showBack backTo={emailOtpBackScreen} />

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        <p className="text-sm text-muted-foreground">
          {isAdminFlow
            ? t.adminCodeSent
            : isStaffFlow
              ? t.staffCodeSent.replace("{email}", emailOtpEmail || "")
              : emailOtpEmail
                ? t.loginCodeSentToEmail.replace("{email}", emailOtpEmail)
                : t.enterLoginCodeFromEmail}
        </p>

        {(authError || info) && (
          <div
            className={`p-3 rounded-lg text-sm ${
              authError
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-foreground"
            }`}
          >
            {authError || info}
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
          {isSubmitting ? t.signingIn : t.login}
        </Button>

        {isStaffFlow && showStaffPasswordConfirm ? (
          <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
            <p className="text-sm text-muted-foreground">{t.confirmPasswordToResend}</p>
            <Input
              type="password"
              placeholder={t.password}
              value={resendPassword}
              onChange={(e) => setResendPassword(e.target.value)}
              className="h-12"
              autoComplete="current-password"
              autoFocus
            />
            <Button
              type="button"
              className="w-full h-11 text-sm font-semibold"
              disabled={isResending || !resendPassword.trim()}
              onClick={() => void confirmStaffResend()}
            >
              {isResending ? t.sending : t.sendNewCode}
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowStaffPasswordConfirm(false)
                setResendPassword("")
                clearAuthError()
              }}
              className="w-full text-sm text-muted-foreground"
              disabled={isResending}
            >
              {t.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResendClick}
            disabled={
              isResending ||
              (!isAdminFlow && !isStaffFlow && !emailOtpEmail)
            }
            className="w-full text-sm text-primary font-medium disabled:opacity-50"
          >
            {isResending ? t.sending : t.resendCode}
          </button>
        )}

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
