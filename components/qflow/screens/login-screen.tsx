"use client"

import { useRef, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"

export function LoginScreen() {
  const {
    login,
    loginWithGoogle,
    navigateTo,
    isAuthLoading,
    authError,
    clearAuthError,
  } = useApp()
  const t = useT()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userModeHint, setUserModeHint] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setIsSubmitting(true)
    await login(email, password)
    setIsSubmitting(false)
  }

  const handleUserMode = () => {
    clearAuthError()
    setUserModeHint(true)
    emailInputRef.current?.focus()
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex flex-col items-center pt-12 pb-8">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <svg viewBox="0 0 40 40" className="w-10 h-10 text-white">
            <path
              fill="currentColor"
              d="M20 4C11.163 4 4 11.163 4 20s7.163 16 16 16 16-7.163 16-16S28.837 4 20 4zm0 28c-6.627 0-12-5.373-12-12S13.373 8 20 8s12 5.373 12 12-5.373 12-12 12z"
            />
            <path
              fill="currentColor"
              d="M20 12c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 12c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"
            />
            <circle fill="currentColor" cx="20" cy="20" r="2" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t.welcomeBack}</h1>
        <p className="text-muted-foreground mt-1">{t.signInToContinue}</p>
      </div>

      <form onSubmit={handleLogin} className="flex-1 px-6 space-y-4 overflow-auto">
        {authError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {authError}
          </div>
        )}

        {userModeHint && !authError && (
          <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm">
            {t.userModeHint}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={emailInputRef}
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
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isAuthLoading || isSubmitting}
        >
          {isSubmitting ? "..." : t.login}
        </Button>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigateTo("forgot-password")}
            className="text-sm text-primary font-medium hover:underline"
          >
            {t.forgotPassword}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-muted-foreground">{t.orContinueWith}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium"
            onClick={loginWithGoogle}
            disabled={isAuthLoading || isSubmitting}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t.continueWithGoogle}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium"
            onClick={() => {
              clearAuthError()
              navigateTo("email-otp")
            }}
            disabled={isAuthLoading || isSubmitting}
          >
            <Mail className="w-5 h-5 mr-2" />
            {t.continueWithEmailCode}
          </Button>
        </div>

        <div className="pt-4 pb-2 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground text-center mb-2">
              {t.continueAsUser}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-medium"
              onClick={handleUserMode}
              disabled={isAuthLoading || isSubmitting}
            >
              {t.roleUser}
            </Button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground text-center mb-2">
              {t.adminAccess}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-medium"
              onClick={() => {
                clearAuthError()
                navigateTo("admin-phone-otp")
              }}
              disabled={isAuthLoading || isSubmitting}
            >
              {t.adminSignIn}
            </Button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground text-center mb-2">
              {t.staffAccess}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-medium"
              onClick={() => {
                clearAuthError()
                navigateTo("staff-login")
              }}
              disabled={isAuthLoading || isSubmitting}
            >
              {t.staffSignIn}
            </Button>
          </div>
        </div>
      </form>

      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          {t.dontHaveAccount}{" "}
          <button
            onClick={() => navigateTo("register")}
            className="text-primary font-semibold hover:underline"
          >
            {t.register}
          </button>
        </p>
      </div>
    </div>
  )
}
