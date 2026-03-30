"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Star, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export function RateExperienceScreen() {
  const { navigateTo } = useApp()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    // In a real app, this would submit to the backend
    setSubmitted(true)
    setTimeout(() => {
      navigateTo("home")
    }, 2000)
  }

  const handleSkip = () => {
    navigateTo("home")
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-8">
        <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mb-6">
          <Star className="w-12 h-12 text-success fill-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Thank You!</h2>
        <p className="text-muted-foreground text-center">
          Your feedback helps us improve our service.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar 
        title="Rate Your Experience" 
        showBack 
        backTo="home"
      />

      <div className="flex-1 px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            How was your experience?
          </h2>
          <p className="text-muted-foreground">
            Your feedback helps us serve you better
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
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

        {/* Rating Labels */}
        {rating > 0 && (
          <p className="text-center text-lg font-medium text-foreground mb-6">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent!"}
          </p>
        )}

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            placeholder="Tell us more about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full min-h-[120px] px-4 py-3 bg-background border border-input rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        <Button 
          onClick={handleSubmit}
          className="w-full h-12 text-base font-semibold"
          disabled={rating === 0}
        >
          <Send className="w-5 h-5 mr-2" />
          Submit Feedback
        </Button>
        <button 
          onClick={handleSkip}
          className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
