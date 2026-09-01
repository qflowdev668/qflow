"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Star, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export function RateExperienceScreen() {
  const {
    navigateTo,
    pendingVisitRating,
    refreshPendingRating,
    submitVisitRating,
    skipVisitRating,
    authError,
    clearAuthError,
  } = useApp()
  const t = useT()
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(!pendingVisitRating)

  useEffect(() => {
    if (pendingVisitRating) {
      setIsLookingUp(false)
      return
    }
    let cancelled = false
    setIsLookingUp(true)
    void refreshPendingRating().then((pending) => {
      if (cancelled) return
      setIsLookingUp(false)
      if (!pending) {
        router.replace("/home?toast=rate_denied")
      }
    })
    return () => {
      cancelled = true
    }
  }, [pendingVisitRating, refreshPendingRating, router])

  const handleSubmit = async () => {
    if (rating === 0) return
    clearAuthError()
    setIsSaving(true)
    const ok = await submitVisitRating(rating, comment)
    setIsSaving(false)
    if (!ok) return
    setSubmitted(true)
    setTimeout(() => {
      navigateTo("home")
    }, 2000)
  }

  const handleSkip = () => {
    skipVisitRating()
    navigateTo("home")
  }

  const ratingLabels = [
    "",
    t.ratingPoor,
    t.ratingFair,
    t.ratingGood,
    t.ratingVeryGood,
    t.ratingExcellent,
  ]

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-8">
        <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mb-6">
          <Star className="w-12 h-12 text-success fill-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t.thankYou}</h2>
        <p className="text-muted-foreground text-center">
          {t.feedbackHelpsImprove}
        </p>
      </div>
    )
  }

  if (isLookingUp || !pendingVisitRating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        title={t.rateYourExperience}
        showBack
        backTo="home"
      />

      <div className="flex-1 px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {t.howWasExperience}
          </h2>
          <p className="text-muted-foreground">
            {pendingVisitRating.locationName}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-2 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "w-10 h-10 transition-colors",
                  (hoveredRating || rating) >= star
                    ? "text-secondary fill-secondary"
                    : "text-border"
                )}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-center text-lg font-medium text-foreground mb-6">
            {ratingLabels[rating]}
          </p>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            {t.additionalComments}
          </label>
          <textarea
            placeholder={t.tellUsMore}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full min-h-[120px] px-4 py-3 bg-background border border-input rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        {authError && (
          <p className="text-sm text-destructive text-center mb-4">{authError}</p>
        )}

        <Button
          onClick={() => void handleSubmit()}
          className="w-full h-12 text-base font-semibold"
          disabled={rating === 0 || isSaving}
        >
          <Send className="w-5 h-5 mr-2" />
          {t.submitFeedback}
        </Button>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          {t.skip}
        </button>
      </div>
    </div>
  )
}
