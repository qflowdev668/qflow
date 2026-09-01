"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TopBar } from "@/components/qflow/top-bar"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"

export function StaffLoginScreen() {
  const { startStaffLogin, navigateTo, authError, clearAuthError } = useApp()
  const t = useT()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Google OAuth is intentionally omitted on /login/staff (email + password only).

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setIsSubmitting(true)
    await startStaffLogin(email, password)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar title={t.staffSignIn} showBack backTo="login" />

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        <p className="text-sm text-muted-foreground">{t.staffLoginDesc}</p>

        {authError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {authError}
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder={t.emailAddress}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-11 h-12"
            required
            autoComplete="email"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-11 pr-11 h-12"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting || !email || !password}
        >
          {isSubmitting ? t.sendingCode : t.continueWithPassword}
        </Button>

        <p className="text-xs text-muted-foreground text-center">{t.staffLoginOtpHint}</p>

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
