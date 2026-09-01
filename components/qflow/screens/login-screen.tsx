"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QFlowLogo } from "@/components/qflow/qflow-logo"
import {
  consumeUnlockQueryParam,
  unlockPrivateAccess,
} from "@/lib/private-access"
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react"

const STAFF_HOLD_MS = 2500
const ADMIN_CLICKS_REQUIRED = 7
const ADMIN_CLICK_GAP_MS = 2000

export function LoginScreen() {
  const {
    login,
    loginWithGoogle,
    navigateTo,
    isAuthLoading,
    authError,
    clearAuthError,
  } = useApp()
  const router = useRouter()
  const t = useT()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [adminClickCount, setAdminClickCount] = useState(0)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const lastAdminClickAt = useRef(0)

  /** Same unlock + route used by `?unlock=admin` (sessionStorage flag → gated page). */
  const openAdminLogin = () => {
    unlockPrivateAccess("admin")
    router.push("/login/admin")
  }

  // One-time links: /login?unlock=staff|admin (onboarding / emergency fallback)
  useEffect(() => {
    if (typeof window === "undefined") return
    const kind = consumeUnlockQueryParam(window.location.search)
    if (!kind) return
    const url = new URL(window.location.href)
    url.searchParams.delete("unlock")
    window.history.replaceState({}, "", `${url.pathname}${url.search}`)
    // Real App Router paths (same as PrivateLoginGate), not screen-id navigateTo.
    router.replace(kind === "admin" ? "/login/admin" : "/login/staff")
  }, [router])

  const busy = isAuthLoading || isSubmitting

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    clearAuthError()
    setIsSubmitting(true)
    await login(email, password)
    setIsSubmitting(false)
  }

  /** Staff unlock: pointer hold ~2.5s (mouse click-and-hold or touch). */
  const onBrandPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    holdTimer.current = setTimeout(() => {
      unlockPrivateAccess("staff")
      router.push("/login/staff")
    }, STAFF_HOLD_MS)
  }

  const onBrandPointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current || !holdTimer.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.hypot(dx, dy) > 12) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  const onBrandPointerUp = () => {
    pointerStart.current = null
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  const onBrandPointerCancel = () => {
    pointerStart.current = null
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  /** Admin unlock: 7 clicks on the brand with ≤2s between clicks (invisible). */
  const onBrandClick = () => {
    const now = Date.now()
    const gapExpired =
      lastAdminClickAt.current > 0 &&
      now - lastAdminClickAt.current > ADMIN_CLICK_GAP_MS
    lastAdminClickAt.current = now

    const next = gapExpired ? 1 : adminClickCount + 1
    if (next >= ADMIN_CLICKS_REQUIRED) {
      setAdminClickCount(0)
      lastAdminClickAt.current = 0
      openAdminLogin()
      return
    }
    setAdminClickCount(next)
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-8 overflow-auto">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div
            data-testid="login-brand"
            className="mb-2 select-none touch-none"
            onPointerDown={onBrandPointerDown}
            onPointerMove={onBrandPointerMove}
            onPointerUp={onBrandPointerUp}
            onPointerCancel={onBrandPointerCancel}
            onClick={onBrandClick}
          >
            <QFlowLogo size="md" className="mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t.welcomeBack}
            </h1>
            <p className="text-muted-foreground">{t.signInToContinue}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                {authError}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t.emailAddress}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 text-base rounded-xl w-full bg-white"
                required
                autoComplete="email"
                disabled={busy}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12 h-14 text-base rounded-xl w-full bg-white"
                required
                autoComplete="current-password"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigateTo("forgot-password")}
              className="text-sm text-primary hover:text-primary/80"
              disabled={busy}
            >
              {t.forgotPassword}
            </button>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold rounded-xl"
              disabled={busy}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t.login}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  {t.orContinueWith}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 text-base font-medium rounded-xl bg-white"
              onClick={loginWithGoogle}
              disabled={busy}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t.continueWithGoogle}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 text-base font-medium rounded-xl bg-white"
              onClick={() => {
                clearAuthError()
                navigateTo("email-otp")
              }}
              disabled={busy}
            >
              <Mail className="h-5 w-5 mr-2" />
              {t.continueWithEmailCode}
            </Button>
          </form>
        </div>
      </div>

      <div className="p-6 border-t border-border text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          {t.dontHaveAccount}{" "}
          <button
            type="button"
            onClick={() => navigateTo("register")}
            className="text-primary font-semibold hover:underline"
          >
            {t.register}
          </button>
        </p>
        <p className="text-xs text-muted-foreground/90">
          {t.staffOrAdminContactHint}{" "}
          <a
            href={`mailto:support@qflow.co.za?subject=${encodeURIComponent("QFlow staff or admin login access")}`}
            className="text-muted-foreground underline-offset-2 hover:underline"
          >
            {t.staffOrAdminContactLink}
          </a>
        </p>
      </div>
    </div>
  )
}
