"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { useChromeInsets } from "@/hooks/use-chrome-insets"
import { TopBar } from "@/components/qflow/top-bar"
import { MenuRow } from "@/components/qflow/user-screen-layout"
import { AskQflowAssistant } from "@/components/qflow/ask-qflow-assistant"
import { HelpSupportScene } from "@/components/qflow/illustrations/queue-scenes"
import { Button } from "@/components/ui/button"
import {
  Accessibility,
  Activity,
  ChevronRight,
  Mail,
  RotateCcw,
} from "lucide-react"

const SUPPORT_EMAIL = "support@qflow.co.za"

export function HelpSupportScreen() {
  const { navigateTo } = useApp()
  const t = useT()
  const { paddingBottom } = useChromeInsets()
  const [clearing, setClearing] = useState(false)

  const faqs = [
    { q: t.helpFaqJoinQ, a: t.helpFaqJoinA },
    { q: t.helpFaqMissTurnQ, a: t.helpFaqMissTurnA },
    { q: t.helpFaqTwoQueuesQ, a: t.helpFaqTwoQueuesA },
    { q: t.helpFaqTurnQ, a: t.helpFaqTurnA },
    { q: t.helpFaqPriorityQ, a: t.helpFaqPriorityA },
  ]

  const handleClearAppData = () => {
    setClearing(true)
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch {
      /* ignore storage errors */
    }
    window.location.href = "/"
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar
        title={t.helpSupport}
        showBack
        onBack={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back()
            return
          }
          navigateTo("home")
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom }} data-testid="help-support-screen">
        {/* Compact hero so FAQ is visible without scrolling on most phones */}
        <div className="px-4 pb-2 pt-2">
          <div className="mx-auto w-full max-w-xs overflow-hidden rounded-3xl border border-border/80">
            <HelpSupportScene className="h-auto w-full" />
          </div>
        </div>

        <div className="px-4">
          <p className="mb-4 text-base text-muted-foreground">{t.helpIntro}</p>

          <AskQflowAssistant />

          <section className="mb-8" data-testid="help-faq">
            <h2 className="mb-3 text-lg font-bold text-foreground">
              {t.helpSectionCommonQuestions}
            </h2>
            <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/80">
              {faqs.map((item) => (
                <div key={item.q} className="px-4 py-4">
                  <p className="text-base font-semibold text-foreground mb-2">{item.q}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Panel 3 — contact & technical */}
          <section
            className="mb-6 rounded-2xl border border-border/80 bg-card p-4"
            data-testid="help-contact"
          >
            <h2 className="mb-2 font-bold text-foreground">{t.helpSectionContact}</h2>
            <p className="mb-2 text-sm text-muted-foreground">{t.helpContactDesc}</p>
            <p className="mb-4 text-sm font-bold text-foreground">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="underline underline-offset-2"
                data-testid="help-support-email"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <Button type="button" className="w-full h-12 rounded-2xl font-bold" asChild>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("QFlow support")}`}
              >
                <Mail className="w-4 h-4 mr-2" />
                {t.helpSendMessage}
              </a>
            </Button>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              {t.staffOrAdminContactHint}{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("QFlow staff or admin login access")}`}
                className="underline underline-offset-2"
              >
                {t.staffOrAdminContactLink}
              </a>
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">
              {t.helpSectionTechnical}
            </h2>
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
              <MenuRow
                icon={Activity}
                label={t.helpCheckSystemStatus}
                onClick={() => {
                  window.location.href = "/status"
                }}
                right={<ChevronRight className="h-5 w-5 text-muted-foreground" />}
                className="help-status-link"
              />
              <MenuRow
                icon={RotateCcw}
                label={clearing ? t.helpClearingData : t.helpClearAppData}
                onClick={handleClearAppData}
                className={clearing ? "opacity-60 pointer-events-none" : undefined}
                right={<ChevronRight className="w-5 h-5 text-muted-foreground" />}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">{t.helpClearAppDataHint}</p>
          </section>

          <section className="pb-6">
            <h2 className="text-lg font-bold text-foreground mb-3">
              {t.helpSectionAccessibility}
            </h2>
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card">
              <MenuRow
                icon={Accessibility}
                label={t.helpAccessibilitySettings}
                onClick={() => navigateTo("accessibility-settings")}
                right={<ChevronRight className="w-5 h-5 text-muted-foreground" />}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
