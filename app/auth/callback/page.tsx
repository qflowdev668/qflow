"use client"

import { QFlowSplash } from "@/components/qflow/qflow-splash"
import { useT } from "@/hooks/use-t"

/**
 * First paint for the callback route. The shell overlay is the instance
 * that stays mounted and performs the one-time code exchange.
 */
export default function AuthCallbackPage() {
  const t = useT()
  return <QFlowSplash subtitle={t.signingYouIn} decorative />
}
