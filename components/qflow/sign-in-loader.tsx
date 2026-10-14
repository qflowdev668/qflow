"use client"

import { useEffect, useMemo, useState } from "react"
import { QFlowLogo } from "@/components/qflow/qflow-logo"
import { fmt, useT } from "@/hooks/use-t"
import { AUTH_SPLASH_FADE_MS } from "@/lib/auth-callback-flow"
import { cn } from "@/lib/utils"

/** Status line holds, then cross-fades. The sequence stops on the last line. */
export const SIGN_IN_STATUS_HOLD_MS = 1400
export const SIGN_IN_STATUS_FADE_MS = 150

const STATUS_LAST = 2

export type SignInLoaderPhase = "waiting" | "confirmed" | "slow"

type SignInLoaderProps = {
  phase?: SignInLoaderPhase
  fading?: boolean
  firstName?: string | null
  onRetry?: () => void
  onBack?: () => void
}

/**
 * Sign-in wait: joining the queue and stepping to the front.
 * Mounted once by the app shell for /auth/callback and any later post-auth wait.
 * The startup splash is a different component.
 */
export function SignInLoader({
  phase = "waiting",
  fading = false,
  firstName = null,
  onRetry,
  onBack,
}: SignInLoaderProps) {
  const t = useT()
  const [reduced, setReduced] = useState(false)
  const [index, setIndex] = useState(0)
  const [textHidden, setTextHidden] = useState(false)
  const lines = useMemo(
    () => [t.signInCheckingDetails, t.signInFindingPlace, t.signInAlmostThere],
    [t.signInCheckingDetails, t.signInFindingPlace, t.signInAlmostThere]
  )
  const shownIndex = phase === "confirmed" ? STATUS_LAST : index
  const shuffling = phase === "waiting" && !reduced
  const logoFloat = !reduced && phase !== "slow"

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduced(media.matches)
    apply()
    media.addEventListener?.("change", apply)
    return () => media.removeEventListener?.("change", apply)
  }, [])

  useEffect(() => {
    if (phase !== "waiting" || index >= STATUS_LAST) return
    let swap = 0
    const hold = window.setTimeout(() => {
      setTextHidden(true)
      swap = window.setTimeout(() => {
        setIndex((current) => Math.min(current + 1, STATUS_LAST))
        setTextHidden(false)
      }, SIGN_IN_STATUS_FADE_MS)
    }, SIGN_IN_STATUS_HOLD_MS)
    return () => {
      window.clearTimeout(hold)
      window.clearTimeout(swap)
    }
  }, [phase, index])

  const status =
    phase === "slow" ? t.signInTakingLonger : lines[shownIndex] ?? lines[0]
  const welcome = firstName ? fmt(t.signInWelcomeName, { name: firstName }) : null

  return (
    <div
      data-testid="sign-in-loader"
      className={cn(
        "fixed inset-0 z-[80] flex flex-col items-center justify-center bg-primary px-6 transition-opacity motion-reduce:transition-none",
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      style={{ transitionDuration: `${AUTH_SPLASH_FADE_MS}ms` }}
      aria-busy={phase === "waiting" && !fading}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className={cn("mb-8", logoFloat && "qflow-sign-in-float")}>
          <QFlowLogo size="xl" variant="frosted" />
        </div>

        <div className="relative flex h-24 w-full items-center justify-center">
          <div
            data-testid="sign-in-queue"
            aria-hidden="true"
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-200 motion-reduce:transition-none",
              phase === "confirmed" ? "pointer-events-none opacity-0" : "opacity-100"
            )}
          >
            <div className="relative h-7 w-[130px]">
              <div className="qflow-queue-window">
                <div className={cn("qflow-queue-track", shuffling && "qflow-queue-shuffle")}>
                  {Array.from({ length: 6 }, (_, slot) => (
                    <span key={slot} className="qflow-queue-slot">
                      <span className="qflow-queue-dot" />
                    </span>
                  ))}
                </div>
              </div>
              <span className="qflow-queue-front" />
            </div>
          </div>

          {phase === "confirmed" ? (
            <div
              data-testid="sign-in-ticket"
              className={cn(
                "relative z-10 flex min-w-[220px] items-center gap-3 rounded-2xl bg-white px-4 py-3 text-foreground shadow-lg",
                !reduced && "qflow-ticket-in"
              )}
            >
              <span
                data-testid="sign-in-tick"
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10B981]",
                  !reduced && "qflow-tick-spring"
                )}
                aria-hidden="true"
              >
                <svg viewBox="220 158 24 20" className="h-4 w-5" fill="none" aria-hidden="true">
                  <path
                    d="M228 168 L231 171 L237 165"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 text-left">
                <p className="text-base font-semibold leading-tight">{t.signInYoureNext}</p>
                {welcome ? (
                  <p data-testid="sign-in-welcome" className="mt-0.5 text-sm text-muted-foreground">
                    {welcome}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <p
          data-testid="sign-in-status"
          role="status"
          aria-live="polite"
          className={cn(
            "mt-8 min-h-6 text-center text-base font-medium text-white transition-opacity",
            phase === "waiting" && textHidden ? "opacity-0" : "opacity-100"
          )}
          style={{ transitionDuration: `${SIGN_IN_STATUS_FADE_MS}ms` }}
        >
          {status}
        </p>

        {phase === "slow" ? (
          <div data-testid="sign-in-slow" className="mt-6 w-full max-w-sm">
            <button
              type="button"
              className="mb-3 h-12 w-full rounded-xl bg-white text-base font-semibold text-primary"
              onClick={onRetry}
            >
              {t.retry}
            </button>
            <button
              type="button"
              className="h-11 w-full text-sm font-medium text-white"
              onClick={onBack}
            >
              {t.backToSignIn}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
