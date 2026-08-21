"use client"

import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Mail } from "lucide-react"

const SUPPORT_EMAIL = "qflowdev668@gmail.com"

export function HelpSupportScreen() {
  const { navigateTo } = useApp()
  const t = useT()

  const faqs = [
    { q: t.helpFaqJoinQ, a: t.helpFaqJoinA },
    { q: t.helpFaqTurnQ, a: t.helpFaqTurnA },
    { q: t.helpFaqLeaveQ, a: t.helpFaqLeaveA },
    { q: t.helpFaqPasswordQ, a: t.helpFaqPasswordA },
    { q: t.helpFaqRolesQ, a: t.helpFaqRolesA },
    { q: t.helpFaqPrivacyQ, a: t.helpFaqPrivacyA },
  ]

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar title={t.helpSupport} showBack backTo="profile" />

      <div className="flex-1 px-6 py-6 overflow-auto space-y-6">
        <p className="text-sm text-muted-foreground">{t.helpIntro}</p>

        <Accordion type="single" collapsible className="rounded-xl border border-border px-4">
          {faqs.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger className="text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="rounded-xl border border-border p-4 space-y-3">
          <h2 className="font-semibold text-foreground">{t.helpContactTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.helpContactDesc}</p>
          <Button
            type="button"
            className="w-full h-11"
            onClick={() => {
              window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("QFlow help")}`
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            {t.helpEmailUs}
          </Button>
          <p className="text-xs text-muted-foreground text-center">{SUPPORT_EMAIL}</p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo("profile")}
          className="w-full text-sm text-primary font-medium pb-4"
        >
          {t.navProfile}
        </button>
      </div>
    </div>
  )
}
