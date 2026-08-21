"use client"

import { Check, Circle } from "lucide-react"
import { getPasswordChecks, type PasswordRuleId } from "@/lib/password"

const RULES: { id: PasswordRuleId; labelKey: PasswordRuleLabelKey }[] = [
  { id: "length", labelKey: "passwordRuleLength" },
  { id: "lower", labelKey: "passwordRuleLower" },
  { id: "upper", labelKey: "passwordRuleUpper" },
  { id: "number", labelKey: "passwordRuleNumber" },
  { id: "symbol", labelKey: "passwordRuleSymbol" },
]

export type PasswordRuleLabelKey =
  | "passwordRuleLength"
  | "passwordRuleLower"
  | "passwordRuleUpper"
  | "passwordRuleNumber"
  | "passwordRuleSymbol"

type Labels = Record<PasswordRuleLabelKey, string>

export function PasswordRules({
  password,
  labels,
}: {
  password: string
  labels: Labels
}) {
  const checks = getPasswordChecks(password)

  return (
    <ul className="space-y-1.5 text-xs">
      {RULES.map((rule) => {
        const ok = checks[rule.id]
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 ${
              ok ? "text-emerald-600" : "text-muted-foreground"
            }`}
          >
            {ok ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 shrink-0" />
            )}
            {labels[rule.labelKey]}
          </li>
        )
      })}
    </ul>
  )
}
