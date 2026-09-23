"use client"

import { useState } from "react"
import { useApp, TextSize, ButtonSize } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { useChromeInsets } from "@/hooks/use-chrome-insets"
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
    { value: "x-large", label: t.sizeXLarge },
  ]

  const buttonSizeOptions: { value: ButtonSize; label: string }[] = [
    { value: "normal", label: t.sizeNormal },
    { value: "large", label: t.sizeLarge },
    { value: "x-large", label: t.sizeExtraLarge },
  ]

  const [textSize, setTextSize] = useState<TextSize>(accessibility.textSize)
  const [highContrast, setHighContrast] = useState(accessibility.highContrast)
  const [simplifiedMode, setSimplifiedMode] = useState(accessibility.simplifiedMode)
  const [buttonSize, setButtonSize] = useState<ButtonSize>(accessibility.buttonSize)
  const [showSavedToast, setShowSavedToast] = useState(false)

  const textSizeIndex = textSizeOptions.findIndex((opt) => opt.value === textSize)

  const getPreviewTextSize = () => {
    switch (textSize) {
      case "small":
        return "text-sm"
      case "normal":
        return "text-base"
      case "large":
        return "text-xl"
      case "x-large":
        return "text-2xl"
    }
  }

  const handleSave = () => {
    setAccessibility({
      textSize,
      highContrast,
      simplifiedMode,
      buttonSize,
    })
    setShowSavedToast(true)
    setTimeout(() => {
      setShowSavedToast(false)
      navigateTo("profile")
    }, 1500)
  }

  const { paddingBottom, fixedFooterBottom } = useChromeInsets({
    fixedSaveFooter: true,
  })

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom }}
      data-testid="accessibility-settings"
    >
      <TopBar title={t.accessibility} showBack onBack={() => navigateTo("profile")} />

      <div className="space-y-8 px-4 py-6">
        <div>
          <h3 className="mb-4 font-medium text-foreground">{t.textSize}</h3>

          <div className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">A</span>
              <span className="text-xl text-muted-foreground">A</span>
            </div>

            <div className="relative h-2 rounded-full bg-muted">
              <div
                className="absolute h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${(textSizeIndex / (textSizeOptions.length - 1)) * 100}%`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-0">
                {textSizeOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTextSize(option.value)}
                    className={cn(
                      "z-10 h-4 w-4 rounded-full border-2 transition-all",
                      index <= textSizeIndex
                        ? "border-primary bg-primary"
                        : "border-border bg-background"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              {textSizeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTextSize(option.value)}
                  className={cn(
                    "text-xs transition-colors",
                    textSize === option.value
                      ? "font-medium text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl bg-muted p-3 text-center"
            data-testid="text-size-preview"
          >
            <p
              className={cn(
                "font-medium text-foreground transition-all",
                getPreviewTextSize()
              )}
            >
              {t.previewPositionExample}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium text-foreground">{t.highContrastMode}</h3>
            <button
              type="button"
              aria-pressed={highContrast}
              data-testid="high-contrast-toggle"
              onClick={() => setHighContrast(!highContrast)}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                highContrast ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                  highContrast ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{t.highContrastDesc}</p>
          <div
            className={cn(
              "rounded-xl border p-3 text-center transition-colors",
              highContrast
                ? "border-white bg-black text-white"
                : "border-border bg-muted text-foreground"
            )}
            data-testid="high-contrast-preview"
          >
            <p className="text-sm font-semibold">{t.previewPositionExample}</p>
            <p className="mt-1 text-xs opacity-80">{t.highContrastDesc}</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium text-foreground">{t.simplifiedMode}</h3>
            <button
              type="button"
              aria-pressed={simplifiedMode}
              data-testid="simple-mode-toggle"
              onClick={() => setSimplifiedMode(!simplifiedMode)}
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                simplifiedMode ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                  simplifiedMode ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{t.simplifiedModeDesc}</p>
          <div
            className="rounded-xl border border-border bg-card p-4 text-center"
            data-testid="simple-mode-preview"
          >
            {simplifiedMode ? (
              <>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t.yourNumber}
                </p>
                <p className="my-2 text-5xl font-bold text-foreground">#5</p>
                <p className="text-lg font-semibold text-foreground">
                  {t.waitLabel}: 12 {t.minutes}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t.simplifiedModeDesc}</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-medium text-foreground">{t.buttonSize}</h3>
          <div className="mb-3 flex gap-3">
            {buttonSizeOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    buttonSize === option.value ? "border-primary" : "border-border"
                  )}
                  onClick={() => setButtonSize(option.value)}
                >
                  {buttonSize === option.value && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-sm text-foreground">{option.label}</span>
              </label>
            ))}
          </div>
          <div data-testid="button-size-preview">
            <Button
              type="button"
              className={cn(
                "w-full font-semibold",
                buttonSize === "large" && "h-12 text-base",
                buttonSize === "x-large" && "h-14 text-lg",
                buttonSize === "normal" && "h-10 text-sm"
              )}
            >
              {t.joinQueue}
            </Button>
          </div>
        </div>
      </div>

      <div
        className="fixed left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-background p-4"
        style={{ bottom: fixedFooterBottom }}
        data-testid="fixed-save-footer"
      >
        <Button
          type="button"
          onClick={handleSave}
          className="h-[52px] w-full text-base font-semibold"
        >
          {t.saveAccessibilitySettings}
        </Button>
      </div>

      {showSavedToast && (
        <div
          className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-lg animate-in slide-in-from-bottom"
          style={{ bottom: paddingBottom }}
          data-testid="a11y-saved-toast"
        >
          <p className="text-center text-foreground">{t.settingsSaved}</p>
        </div>
      )}
    </div>
  )
}
