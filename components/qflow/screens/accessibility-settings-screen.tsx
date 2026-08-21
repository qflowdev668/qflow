"use client"

import { useState } from "react"
import { useApp, TextSize, ButtonSize } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AccessibilitySettingsScreen() {
  const { accessibility, setAccessibility, navigateTo } = useApp()
  const t = useT()
  
  const textSizeOptions: { value: TextSize; label: string }[] = [
    { value: "small", label: t.sizeSmall },
    { value: "normal", label: t.sizeNormal },
    { value: "large", label: t.sizeLarge },
    { value: "x-large", label: t.sizeXLarge }
  ]

  const buttonSizeOptions: { value: ButtonSize; label: string }[] = [
    { value: "normal", label: t.sizeNormal },
    { value: "large", label: t.sizeLarge },
    { value: "x-large", label: t.sizeExtraLarge }
  ]

  const [textSize, setTextSize] = useState<TextSize>(accessibility.textSize)
  const [highContrast, setHighContrast] = useState(accessibility.highContrast)
  const [simplifiedMode, setSimplifiedMode] = useState(accessibility.simplifiedMode)
  const [buttonSize, setButtonSize] = useState<ButtonSize>(accessibility.buttonSize)
  const [showSavedToast, setShowSavedToast] = useState(false)

  const textSizeIndex = textSizeOptions.findIndex(opt => opt.value === textSize)

  const getPreviewTextSize = () => {
    switch (textSize) {
      case "small": return "text-sm"
      case "normal": return "text-base"
      case "large": return "text-xl"
      case "x-large": return "text-2xl"
    }
  }

  const handleSave = () => {
    setAccessibility({
      textSize,
      highContrast,
      simplifiedMode,
      buttonSize
    })
    setShowSavedToast(true)
    setTimeout(() => {
      setShowSavedToast(false)
      navigateTo("profile")
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar title={t.accessibility} showBack onBack={() => navigateTo("profile")} />

      <div className="px-4 py-6 space-y-8">
        <div>
          <h3 className="font-medium text-gray-800 mb-4">{t.textSize}</h3>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">A</span>
              <span className="text-xl text-gray-500">A</span>
            </div>
            
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div 
                className="absolute h-full bg-primary rounded-full transition-all"
                style={{ width: `${(textSizeIndex / (textSizeOptions.length - 1)) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-0">
                {textSizeOptions.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => setTextSize(option.value)}
                    className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all z-10",
                      index <= textSizeIndex 
                        ? "bg-primary border-primary" 
                        : "bg-white border-gray-300"
                    )}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              {textSizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTextSize(option.value)}
                  className={cn(
                    "text-xs transition-colors",
                    textSize === option.value ? "text-primary font-medium" : "text-gray-500"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className={cn("text-foreground font-medium transition-all", getPreviewTextSize())}>
              {t.previewPositionExample}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-800">{t.highContrastMode}</h3>
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                highContrast ? "bg-primary" : "bg-gray-300"
              )}
            >
              <span 
                className={cn(
                  "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all",
                  highContrast ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            {t.highContrastDesc}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-800">{t.simplifiedMode}</h3>
            <button
              onClick={() => setSimplifiedMode(!simplifiedMode)}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                simplifiedMode ? "bg-primary" : "bg-gray-300"
              )}
            >
              <span 
                className={cn(
                  "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all",
                  simplifiedMode ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            {t.simplifiedModeDesc}
          </p>
        </div>

        <div>
          <h3 className="font-medium text-gray-800 mb-4">{t.buttonSize}</h3>
          <div className="flex gap-3">
            {buttonSizeOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div 
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    buttonSize === option.value ? "border-primary" : "border-gray-300"
                  )}
                  onClick={() => setButtonSize(option.value)}
                >
                  {buttonSize === option.value && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-sm text-foreground">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button 
          onClick={handleSave}
          className="w-full h-[52px] text-base font-semibold"
        >
          {t.saveAccessibilitySettings}
        </Button>
      </div>

      {showSavedToast && (
        <div className="fixed bottom-20 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
          <p className="text-center text-foreground">{t.settingsSaved}</p>
        </div>
      )}
    </div>
  )
}
