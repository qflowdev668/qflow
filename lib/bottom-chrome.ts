/** Shared bottom-chrome spacing for tab bar + Flow Bar + map overlays. */
export const BOTTOM_NAV_HEIGHT_PX = 72
export const FLOW_BAR_PILL_HEIGHT_PX = 84
export const BOTTOM_CHROME_GAP_PX = 12
/** Fixed save strip: p-4 + h-[52] button. */
export const FIXED_SAVE_FOOTER_PX = 84

/** CSS calc: sit just above the portaled BottomNav. */
export const ABOVE_BOTTOM_NAV =
  `calc(${BOTTOM_NAV_HEIGHT_PX + BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))` as const

/** CSS calc: sit above BottomNav + collapsed Flow Bar pill. */
export const ABOVE_FLOW_BAR_PILL =
  `calc(${BOTTOM_NAV_HEIGHT_PX + FLOW_BAR_PILL_HEIGHT_PX + BOTTOM_CHROME_GAP_PX * 2}px + env(safe-area-inset-bottom, 0px))` as const

/** CSS calc: sit above collapsed Flow Bar only (no tab bar on this screen). */
export const ABOVE_FLOW_BAR_ONLY =
  `calc(${FLOW_BAR_PILL_HEIGHT_PX + BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))` as const

/** Flow Bar `bottom` when BottomNav is mounted. */
export const FLOW_BAR_BOTTOM_WITH_NAV =
  `calc(${BOTTOM_NAV_HEIGHT_PX + BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))` as const

/** Flow Bar `bottom` when no BottomNav (profile subpages, help, etc.). */
export const FLOW_BAR_BOTTOM_NO_NAV =
  `calc(${BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))` as const

/** Content padding that clears a fixed save footer (+ Flow Bar when visible, no tab bar). */
export function contentPadForFixedSave(flowBarVisible: boolean): string {
  if (flowBarVisible) {
    return `calc(${FIXED_SAVE_FOOTER_PX + FLOW_BAR_PILL_HEIGHT_PX + BOTTOM_CHROME_GAP_PX * 2}px + env(safe-area-inset-bottom, 0px))`
  }
  return `calc(${FIXED_SAVE_FOOTER_PX + BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))`
}

/** Content padding that clears Flow Bar alone (inline Save, no fixed footer, no tab bar). */
export function contentPadForFlowBarOnly(flowBarVisible: boolean): string {
  if (!flowBarVisible) return `calc(${BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))`
  return ABOVE_FLOW_BAR_ONLY
}
