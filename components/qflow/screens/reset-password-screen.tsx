"use client"

import { Suspense, useEffect, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TopBar } from "@/components/qflow/top-bar"
import { Eye, EyeOff, Lock } from "lucide-react"
import { isStrongPassword } from "@/lib/password"
import { PasswordRules } from "@/components/qflow/password-rules"
import { useResetTokenSession } from "@/components/qflow/use-reset-token-session"
import { createClient } from "@/lib/supabase/client"

function ResetPasswordForm() {
  const {
    completePasswordReset,
    navigateTo,
    authError,
    clearAuthError,
  } = useApp()
  const t = useT()
  const { rt, recovery, session, loading, error: tokenError, router } =
    useResetTokenSession()
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.email) {
      setEmail(session.email)
      return
    }
    if (recovery) {
      const supabase = createClient()
      if (!supabase) return
      void supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) setEmail(data.user.email.toLowerCase())
      })
    }
  }, [session, recovery])

  useEffect(() => {
    if (loading) return
    if (rt && tokenError) {
      navigateTo("forgot-password")
      return
    }
    if (rt && session?.stage === "otp_sent") {
      router.replace(`/forgot-password/verify?rt=${encodeURIComponent(rt)}`)
    }
  }, [loading, rt, tokenError, session, navigateTo, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setLocalError(null)

    if (password !== confirmPassword) {
      setLocalError(t.passwordsDoNotMatch)
      return
    }

    if (!isStrongPassword(password)) {
      setLocalError(t.passwordTooWeak)
      return
    }

    setIsSubmitting(true)
    await completePasswordReset(password, rt)
    setIsSubmitting(false)
  }

  const backToVerify = () => {
    if (rt) {
      router.push(`/forgot-password/verify?rt=${encodeURIComponent(rt)}`)
    } else {
      navigateTo("forgot-password")
    }
  }

  if (rt && (loading || (!session && !tokenError))) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center text-sm text-muted-foreground">
        {t.verifying}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar title={t.resetPassword} showBack onBack={backToVerify} />

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        <p className="text-sm text-muted-foreground">
          {email
            ? t.newPasswordForEmail.replace("{email}", email)
            : t.newPasswordForAccount}
        </p>

        {(authError || localError || tokenError) && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {authError || localError || tokenError}
          </div>
        )}

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={t.newPassword}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-11 pr-11 h-12"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <PasswordRules
          password={password}
          labels={{
            passwordRuleLength: t.passwordRuleLength,
            passwordRuleLower: t.passwordRuleLower,
            passwordRuleUpper: t.passwordRuleUpper,
            passwordRuleNumber: t.passwordRuleNumber,
            passwordRuleSymbol: t.passwordRuleSymbol,
          }}
        />

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={t.confirmNewPassword}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-11 h-12"
            required
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting || !isStrongPassword(password)}
        >
          {isSubmitting ? t.saving : t.updatePassword}
        </Button>

        <button
          type="button"
          onClick={() => navigateTo("login")}
          className="w-full text-sm text-primary font-medium"
        >
          {t.backToLogin}
        </button>
      </form>
    </div>
  )
}

export function ResetPasswordScreen() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-background flex items-center justify-center text-sm text-muted-foreground">
          …
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
