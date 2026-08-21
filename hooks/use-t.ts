"use client"

import { useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { getTranslations, type Language, type TranslationKeys } from "@/lib/i18n"

/** Replace `{key}` placeholders in translated strings. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, String(value))
  }
  return result
}

/** Active UI strings for the signed-in / selected language. */
export function useT(overrideLang?: Language): TranslationKeys {
  const { language } = useApp()
  return useMemo(() => getTranslations(overrideLang ?? language), [overrideLang, language])
}
