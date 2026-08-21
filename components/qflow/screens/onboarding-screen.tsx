"use client"

import { useState } from "react"
import { useApp, languageOptions, Language } from "@/lib/app-context"
import { getTranslations } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { MapPin, Smartphone, CheckCircle2, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Total steps = 1 (language) + 3 (onboarding steps)
const TOTAL_STEPS = 4

export function OnboardingScreen() {
  const { completeOnboarding, setLanguage } = useApp()
  const [currentStep, setCurrentStep] = useState(0) // 0 = language step, 1-3 = onboarding steps
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en")

  // Live preview of the language the user is tapping — applies immediately on this screen
  const t = getTranslations(selectedLanguage)

  const steps = [
    {
      icon: MapPin,
      title: t.findLocationTitle,
      description: t.findLocationDesc,
    },
    {
      icon: Smartphone,
      title: t.joinRemotelyTitle,
      description: t.joinRemotelyDesc,
    },
    {
      icon: CheckCircle2,
      title: t.arriveReadyTitle,
      description: t.arriveReadyDesc,
    },
  ]

  const handleNext = () => {
    if (currentStep === 0) {
      setLanguage(selectedLanguage)
      setCurrentStep(1)
    } else if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    if (currentStep === 0) {
      setLanguage(selectedLanguage)
    }
    completeOnboarding()
  }

  // Language selection step (Step 0)
  if (currentStep === 0) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col">
        <div className="flex justify-end p-4">
          <button
            onClick={handleSkip}
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            {t.skip}
          </button>
        </div>

        <div className="flex-1 flex flex-col px-6 pt-4">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">Q</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            {t.welcomeToQflow}
          </h1>
          <p className="text-sm text-gray-500 text-center italic mb-6">
            {t.welcomeSubtitle}
          </p>

          <p className="text-sm text-gray-600 text-center mb-4">
            {t.chooseLanguage}
          </p>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {languageOptions.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-colors min-h-[52px]",
                  selectedLanguage === lang.code
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <div className="text-left">
                    <p className="font-semibold text-foreground text-sm">{lang.english}</p>
                    <p className="text-xs text-gray-500">{lang.native}</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedLanguage === lang.code
                      ? "border-[#2563EB]"
                      : "border-gray-300"
                  )}
                >
                  {selectedLanguage === lang.code && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 pb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
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

          <Button
            onClick={handleNext}
            className="w-full h-[52px] text-base font-semibold"
          >
            {t.continue}
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  const stepIndex = currentStep - 1
  const step = steps[stepIndex]
  const Icon = step.icon

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
        >
          {t.skip}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-8">
          <Icon className="w-16 h-16 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-foreground text-center mb-4">
          {step.title}
        </h2>
        <p className="text-muted-foreground text-center text-base leading-relaxed max-w-sm">
          {step.description}
        </p>
      </div>

      <div className="p-6 pb-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
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

        <Button
          onClick={handleNext}
          className="w-full h-12 text-base font-semibold"
        >
          {currentStep === TOTAL_STEPS - 1 ? t.getStarted : t.next}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  )
}
