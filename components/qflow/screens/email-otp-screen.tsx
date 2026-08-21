"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TopBar } from "@/components/qflow/top-bar"
import { Mail } from "lucide-react"

export function EmailOtpScreen() {
  const { startEmailOtpLogin, navigateTo, authError, clearAuthError } = useApp()
  const t = useT()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setIsSubmitting(true)
    await startEmailOtpLogin(email)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar title={t.emailCode} showBack backTo="login" />

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        <p className="text-sm text-muted-foreground">
          {t.emailCodeDesc}
        </p>

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

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? t.sendingCode : t.sendLoginCode}
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
