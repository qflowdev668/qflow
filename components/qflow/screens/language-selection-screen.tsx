"use client"

import { useState } from "react"
import { useApp, languageOptions, Language } from "@/lib/app-context"
import { getTranslations } from "@/lib/i18n"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LanguageSelectionScreen() {
  const { language, setLanguage, navigateTo, activeQueue } = useApp()
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

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
    <div className="min-h-screen bg-background">
      <TopBar title={preview.selectLanguage} showBack onBack={() => navigateTo("profile")} />

      <div className="p-4">
        <p className="text-sm text-gray-500 text-center mb-6">
          {preview.chooseLanguage}
        </p>

        <div className="space-y-2 mb-8">
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-colors min-h-[60px]",
                selectedLanguage === lang.code
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white border-gray-200 hover:border-gray-300"
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

        <div className="mb-8">
          <p className="text-sm text-gray-500 text-center mb-3">{preview.preview}</p>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-foreground font-medium">{preview.youreInQueue}</p>
            <p className="text-gray-600">
              {preview.peopleAhead} {activeQueue ? activeQueue.position - 1 : 0}
            </p>
            <p className="text-gray-600">
              {preview.estWait} ~{activeQueue?.estimatedWait ?? 0} min
            </p>
            <p className="text-[#EF4444] font-medium mt-2">{preview.leaveQueue}</p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full h-[52px] text-base font-semibold bg-[#2563EB] hover:bg-[#2563EB]/90"
        >
          {preview.saveLanguage}
        </Button>
      </div>

      {showToast && (
        <div className="fixed bottom-6 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
          <p className="text-center text-foreground">{toastMessage}</p>
        </div>
      )}
    </div>
  )
}
