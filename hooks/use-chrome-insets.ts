"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/app-context"
import {
  ABOVE_BOTTOM_NAV,
  ABOVE_FLOW_BAR_ONLY,
  ABOVE_FLOW_BAR_PILL,
  contentPadForFixedSave,
  contentPadForFlowBarOnly,
} from "@/lib/bottom-chrome"

/** True while the portaled BottomNav has set `data-has-bottom-nav` on body. */
export function useHasBottomNav(): boolean {
  const [hasBottomNav, setHasBottomNav] = useState(false)

  useEffect(() => {
    const read = () =>
      setHasBottomNav(document.body.dataset.hasBottomNav === "true")
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-has-bottom-nav"],
    })
    return () => observer.disconnect()
  }, [])

  return hasBottomNav
}

function isFlowBarStatus(status: string) {
  return ["waiting", "almost", "your-turn", "serving"].includes(status)
}

/**
 * Layout insets for screens that share the viewport with Flow Bar / BottomNav.
 * Flow Bar is hidden on /queue (my-queue) — matching FlowBar's own visibility.
 */
export function useChromeInsets(opts?: { fixedSaveFooter?: boolean }) {
  const { activeQueue, currentScreen } = useApp()
  const hasBottomNav = useHasBottomNav()
  const flowBarVisible =
    Boolean(activeQueue) &&
    isFlowBarStatus(activeQueue!.status) &&
    currentScreen !== "my-queue"

  const fixedFooterBottom = flowBarVisible
    ? hasBottomNav
      ? ABOVE_FLOW_BAR_PILL
      : ABOVE_FLOW_BAR_ONLY
    : hasBottomNav
      ? ABOVE_BOTTOM_NAV
      : `env(safe-area-inset-bottom, 0px)`

  const paddingBottom = opts?.fixedSaveFooter
    ? hasBottomNav
      ? flowBarVisible
        ? ABOVE_FLOW_BAR_PILL
        : ABOVE_BOTTOM_NAV
      : contentPadForFixedSave(flowBarVisible)
    : hasBottomNav
      ? flowBarVisible
        ? ABOVE_FLOW_BAR_PILL
        : ABOVE_BOTTOM_NAV
      : contentPadForFlowBarOnly(flowBarVisible)

  return {
    hasBottomNav,
    flowBarVisible,
    /** CSS `bottom` for a fixed Save strip (max-w-md, centered). */
    fixedFooterBottom,
    /** CSS `paddingBottom` for scrollable page content. */
    paddingBottom,
  }
}
