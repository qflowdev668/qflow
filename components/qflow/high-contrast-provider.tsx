"use client"

import { useApp } from "@/lib/app-context"

/**
 * Applies high-contrast CSS class via documentElement (globals.css).
 * Floating toggle lets users exit without opening Accessibility settings.
 */
export function HighContrastProvider({ children }: { children: React.ReactNode }) {
  const { accessibility, setAccessibility } = useApp()
  const highContrast = accessibility.highContrast

  const toggleHighContrast = () => {
    setAccessibility({
      ...accessibility,
      highContrast: !accessibility.highContrast,
    })
  }

  return (
    <>
      {children}
      {highContrast && (
        <button
          type="button"
          onClick={toggleHighContrast}
          className="fixed bottom-24 left-4 z-[100] flex items-center gap-1.5 rounded-full border border-white bg-[#1a1a1a] px-3 py-2 text-xs text-white"
          data-testid="high-contrast-exit"
        >
          High Contrast: ON
        </button>
      )}
    </>
  )
}
