"use client"

import { languageOptions, Language } from "@/lib/app-context"
import { cn } from "@/lib/utils"

interface KioskLanguageBarProps {
  selectedLanguage: Language
  onLanguageChange: (lang: Language) => void
}

export function KioskLanguageBar({ selectedLanguage, onLanguageChange }: KioskLanguageBarProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-2">
      <div className="flex flex-row gap-2 overflow-x-auto">
        {languageOptions.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={cn(
              "px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors",
              selectedLanguage === lang.code
                ? "bg-[#2563EB] text-white font-medium"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {lang.short}
          </button>
        ))}
      </div>
    </div>
  )
}
