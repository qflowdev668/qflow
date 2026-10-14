"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TopBar } from "@/components/qflow/top-bar"
import { Eye, EyeOff, User, Mail, Lock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { isStrongPassword } from "@/lib/password"
import { SUPPORT_EMAIL } from "@/lib/support-email"
import { PasswordRules } from "@/components/qflow/password-rules"

export function RegisterScreen() {
  const {
    register,
    loginWithGoogle,
    navigateTo,
    isAuthLoading,
    authError,
    clearAuthError,
  } = useApp()
  const t = useT()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [notificationConsent, setNotificationConsent] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting || isAuthLoading) return
    clearAuthError()
    setPasswordError(null)

    if (password !== confirmPassword) {
      setPasswordError(t.passwordsDoNotMatch)
      return
    }

    if (!isStrongPassword(password)) {
      setPasswordError(t.passwordTooWeak)
      return
    }

    setIsSubmitting(true)
    // Public sign-up is always a normal user. Staff are created by admins only.
    await register(name, email, password, "user")
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar
        title={t.createAccount}
        showBack
        backTo="login"
      />

      <form onSubmit={handleRegister} className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        {(authError || passwordError) && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {authError || passwordError}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.fullName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-11 h-12"
              required
              autoComplete="name"
            />
          </div>

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
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t.confirmPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-11 pr-11 h-12"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-5 mt-2">
          <p className="text-sm font-medium text-muted-foreground mb-3">{t.privacyAndData}</p>

          <div className="bg-muted/50 border border-border rounded-2xl p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.privacyDataSummary}
            </p>

            <label className="flex items-start gap-3 cursor-pointer">
              <div className="pt-0.5">
                <div
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    privacyConsent ? "bg-primary border-primary" : "border-input bg-background"
                  )}
                  onClick={() => setPrivacyConsent(!privacyConsent)}
                >
                  {privacyConsent && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-foreground">
                {t.agreeToThe}{" "}
                <button
                  type="button"
                  aria-label={t.privacyPolicy}
                  onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true) }}
                  className="text-primary underline hover:text-primary/80"
                >
                  {t.privacyPolicy}
                </button>
                {" "}{t.andTerms}{" "}
                <button
                  type="button"
                  aria-label={t.termsOfService}
                  onClick={(e) => { e.preventDefault(); setShowTermsModal(true) }}
                  className="text-primary underline hover:text-primary/80"
                >
                  {t.termsOfService}
                </button>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <div className="pt-0.5">
                <div
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    notificationConsent ? "bg-primary border-primary" : "border-input bg-background"
                  )}
                  onClick={() => setNotificationConsent(!notificationConsent)}
                >
                  {notificationConsent && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {t.notificationConsentOptional}
              </span>
            </label>
          </div>
        </div>

        <Button
          type="submit"
          className={cn(
            "w-full h-12 text-base font-semibold transition-opacity",
            !privacyConsent && "opacity-50 cursor-not-allowed"
          )}
          disabled={isSubmitting || !privacyConsent || !isStrongPassword(password)}
        >
          {isSubmitting ? t.creatingAccount : t.createAccount}
        </Button>

        <div className="relative my-4">
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
            onClick={() => {
              if (isAuthLoading || isSubmitting) return
              loginWithGoogle()
            }}
            disabled={isSubmitting}
          >
            {t.continueWithGoogle}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium"
            onClick={() => {
              if (isSubmitting) return
              clearAuthError()
              navigateTo("email-otp")
            }}
            disabled={isSubmitting}
          >
            <Mail className="w-5 h-5 mr-2" />
            {t.continueWithEmailCode}
          </Button>
        </div>

      </form>

      <div className="p-6 text-center border-t border-border">
        <p className="text-muted-foreground">
          {t.alreadyHaveAccount}{" "}
          <button
            onClick={() => navigateTo("login")}
            className="text-primary font-semibold hover:underline"
          >
            {t.login}
          </button>
        </p>
      </div>

      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-card rounded-t-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{t.privacyModalTitle}</h2>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t.privacyWhatWeCollect}</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>{t.privacyCollectNameEmail}</li>
                  <li>{t.privacyCollectQueueHistory}</li>
                  <li>{t.privacyCollectLocationSelections}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t.privacyWhatWeDontDo}</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>{t.privacyNeverSell}</li>
                  <li>{t.privacyNeverShare}</li>
                  <li>{t.privacyNoIdStorage}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t.privacyYourRights}</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>{t.privacyRequestData}</li>
                  <li>{t.privacyDeleteAccount}</li>
                  <li>{t.privacyCorrectInfo}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t.privacyDataRetention}</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>{t.privacyQueueHistoryRetention}</li>
                  <li>{t.privacyAccountDataRetention}</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                {t.privacyContact} <span className="text-primary">privacy@qflow.co.za</span>
              </p>
            </div>

            <div className="px-6 py-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowPrivacyModal(false)}
                className="w-full h-12 text-base font-medium"
              >
                {t.close}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-card rounded-t-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{t.termsModalTitle}</h2>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t.termsWhatYouAgree}</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>{t.termsUseForQueues}</li>
                  <li>{t.termsAccurateInfo}</li>
                  <li>{t.termsRespectStaff}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">{t.termsOurCommitments}</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>{t.termsKeepServiceRunning}</li>
                  <li>{t.termsProtectPrivacy}</li>
                  <li>{t.termsFairAccess}</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                {t.termsContact} <span className="text-primary">{SUPPORT_EMAIL}</span>
              </p>
            </div>

            <div className="px-6 py-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowTermsModal(false)}
                className="w-full h-12 text-base font-medium"
              >
                {t.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
