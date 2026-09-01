"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { MenuRow } from "@/components/qflow/user-screen-layout"
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

      <div className="flex-1 min-h-0 overflow-y-auto pb-8">
        {/* Panel 1 — visual hero */}
        <div className="px-4 pt-2 pb-4">
          <div className="rounded-3xl overflow-hidden border border-border/80">
            <HelpSupportScene className="w-full h-auto" />
          </div>
        </div>

        <div className="px-4">
          <p className="text-base text-muted-foreground mb-6">{t.helpIntro}</p>

          {/* Panel 2 — common questions (answers always visible) */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-3">
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
          <section className="rounded-2xl border border-border/80 p-4 mb-6 bg-card">
            <h2 className="font-bold text-foreground mb-2">{t.helpSectionContact}</h2>
            <p className="text-sm text-muted-foreground mb-2">{t.helpContactDesc}</p>
            <p className="text-sm font-bold text-foreground mb-4">{SUPPORT_EMAIL}</p>
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
                right={<ChevronRight className="w-5 h-5 text-muted-foreground" />}
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
