"use client"

import { useState } from "react"
import { useApp, languageOptions, Language } from "@/lib/app-context"
import { getTranslations } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { QFlowLogo } from "@/components/qflow/qflow-logo"
import { UserScreenLayout } from "@/components/qflow/user-screen-layout"
import {
  ArriveReadyScene,
  FindLocationScene,
  JoinRemotelyScene,
} from "@/components/qflow/illustrations/queue-scenes"

const TOTAL_STEPS = 4

export function OnboardingScreen() {
  const { completeOnboarding, setLanguage } = useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en")

  const t = getTranslations(selectedLanguage)

  const steps = [
    {
      illustration: <FindLocationScene className="w-full h-auto" />,
      title: t.findLocationTitle,
      description: t.findLocationDesc,
    },
    {
      illustration: <JoinRemotelyScene className="w-full h-auto" />,
      title: t.joinRemotelyTitle,
      description: t.joinRemotelyDesc,
    },
    {
      illustration: <ArriveReadyScene className="w-full h-auto" />,
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

  const stepDots = (
    <div className="flex items-center justify-center gap-2 mb-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all",
            index === currentStep ? "w-6 bg-primary" : index < currentStep ? "w-2 bg-primary/50" : "w-2 bg-border"
          )}
        />
      ))}
    </div>
  )

  const primaryButton = (
    <>
      {stepDots}
      <Button
        onClick={handleNext}
        className="w-full h-14 text-base font-bold rounded-2xl"
      >
        {currentStep === 0
          ? t.continue
          : currentStep === TOTAL_STEPS - 1
            ? t.getStarted
            : t.next}
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </>
  )

  if (currentStep === 0) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col">
        <div className="flex justify-end p-4">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {t.skip}
          </button>
        </div>

        <div className="px-6 pb-4 shrink-0">
          <div className="flex justify-center mb-4">
            <QFlowLogo size="md" />
          </div>
          <h1 className="text-[1.75rem] font-bold text-foreground text-center mb-2">
            {t.welcomeToQflow}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {t.welcomeSubtitle}
          </p>
        </div>

        <div className="flex-1 px-6 overflow-y-auto">
          <p className="text-sm font-semibold text-foreground mb-3">{t.chooseLanguage}</p>
          <div className="space-y-2">
            {languageOptions.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLanguage(lang.code)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-colors min-h-[52px]",
                  selectedLanguage === lang.code
                    ? "bg-primary/5 border-primary"
                    : "bg-white border-border hover:border-foreground/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">{lang.english}</p>
                    <p className="text-xs text-muted-foreground">{lang.native}</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedLanguage === lang.code ? "border-primary" : "border-border"
                  )}
                >
                  {selectedLanguage === lang.code && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="shrink-0 p-6 pb-8 border-t border-border/80">{primaryButton}</div>
      </div>
    )
  }

  const step = steps[currentStep - 1]

  return (
    <UserScreenLayout
      illustration={step.illustration}
      title={step.title}
      subtitle={step.description}
      onSkip={handleSkip}
      skipLabel={t.skip}
      clearBottomNav={false}
      footer={primaryButton}
    />
  )
}
