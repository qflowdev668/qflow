"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { MapPin, Smartphone, CheckCircle2, ChevronRight } from "lucide-react"

const steps = [
  {
    icon: MapPin,
    title: "Find a Location",
    description: "Discover nearby clinics, banks, and government offices on the map or search by name."
  },
  {
    icon: Smartphone,
    title: "Join Remotely",
    description: "Join queues from anywhere. No need to wait in line physically until it's your turn."
  },
  {
    icon: CheckCircle2,
    title: "Arrive When Ready",
    description: "Get real-time updates and arrive exactly when you're needed. Save hours of waiting."
  }
]

export function OnboardingScreen() {
  const { completeOnboarding } = useApp()
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const step = steps[currentStep]
  const Icon = step.icon

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button 
          onClick={handleSkip}
          className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Icon */}
        <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-8">
          <Icon className="w-16 h-16 text-primary" />
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl font-bold text-foreground text-center mb-4">
          {step.title}
        </h2>
        <p className="text-muted-foreground text-center text-base leading-relaxed max-w-sm">
          {step.description}
        </p>
      </div>

      {/* Footer */}
      <div className="p-6 pb-8">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep 
                  ? "bg-primary w-6" 
                  : index < currentStep 
                    ? "bg-primary/50" 
                    : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <Button 
          onClick={handleNext} 
          className="w-full h-12 text-base font-semibold"
        >
          {currentStep === steps.length - 1 ? "Get Started" : "Next"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}
