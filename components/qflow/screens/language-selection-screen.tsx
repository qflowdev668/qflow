"use client"

import { useState } from "react"
import { useApp, languageOptions, Language } from "@/lib/app-context"
import { getTranslations } from "@/lib/i18n"
import { useChromeInsets } from "@/hooks/use-chrome-insets"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LanguageSelectionScreen() {
  const { language, setLanguage, navigateTo, activeQueue } = useApp()
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const { paddingBottom } = useChromeInsets()

  const preview = getTranslations(selectedLanguage)

  const handleSave = () => {
    setLanguage(selectedLanguage)
    const langName = languageOptions.find((l) => l.code === selectedLanguage)?.english || "English"
    setToastMessage(`${preview.languageUpdated} ${langName}`)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
      navigateTo("profile")
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom }}>
      <TopBar title={preview.selectLanguage} showBack onBack={() => navigateTo("profile")} />

      <div className="p-4">
        <p className="mb-6 text-center text-sm text-gray-500">
          {preview.chooseLanguage}
        </p>

        <div className="mb-8 space-y-2">
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={cn(
                "flex min-h-[60px] w-full items-center justify-between rounded-2xl border-2 p-4 transition-colors",
                selectedLanguage === lang.code
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{lang.english}</p>
                  <p className="text-sm text-gray-500">{lang.native}</p>
                </div>
              </div>
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2",
                  selectedLanguage === lang.code
                    ? "border-[#2563EB]"
                    : "border-gray-300"
                )}
              >
                {selectedLanguage === lang.code && (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mb-8">
          <p className="mb-3 text-center text-sm text-gray-500">{preview.preview}</p>
          <div className="space-y-2 rounded-2xl bg-gray-50 p-4">
            <p className="font-medium text-foreground">{preview.youreInQueue}</p>
            <p className="text-gray-600">
              {preview.peopleAhead} {activeQueue ? activeQueue.position - 1 : 0}
            </p>
            <p className="text-gray-600">
              {preview.estWait} ~{activeQueue?.estimatedWait ?? 0} min
            </p>
            <p className="mt-2 font-medium text-[#EF4444]">{preview.leaveQueue}</p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="h-[52px] w-full bg-[#2563EB] text-base font-semibold hover:bg-[#2563EB]/90"
        >
          {preview.saveLanguage}
        </Button>
      </div>

      {showToast && (
        <div
          className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-qflow -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-lg animate-in slide-in-from-bottom"
          style={{ bottom: paddingBottom }}
        >
          <p className="text-center text-foreground">{toastMessage}</p>
        </div>
      )}
    </div>
  )
}
