import {
  ABOVE_FLOW_BAR_ONLY,
  BOTTOM_CHROME_GAP_PX,
  BOTTOM_NAV_HEIGHT_PX,
  FIXED_SAVE_FOOTER_PX,
  FLOW_BAR_BOTTOM_NO_NAV,
  FLOW_BAR_BOTTOM_WITH_NAV,
  FLOW_BAR_PILL_HEIGHT_PX,
  contentPadForFixedSave,
  contentPadForFlowBarOnly,
} from "@/lib/bottom-chrome"

describe("bottom-chrome", () => {
  it("places Flow Bar lower when there is no tab bar", () => {
    expect(FLOW_BAR_BOTTOM_WITH_NAV).toBe(
      `calc(${BOTTOM_NAV_HEIGHT_PX + BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))`
    )
    expect(FLOW_BAR_BOTTOM_NO_NAV).toBe(
      `calc(${BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))`
    )
  })

  it("reserves more content pad when Flow Bar is visible without a tab bar", () => {
    expect(contentPadForFlowBarOnly(true)).toBe(ABOVE_FLOW_BAR_ONLY)
    expect(contentPadForFixedSave(true)).toBe(
      `calc(${FIXED_SAVE_FOOTER_PX + FLOW_BAR_PILL_HEIGHT_PX + BOTTOM_CHROME_GAP_PX * 2}px + env(safe-area-inset-bottom, 0px))`
    )
    expect(contentPadForFixedSave(false)).toBe(
      `calc(${FIXED_SAVE_FOOTER_PX + BOTTOM_CHROME_GAP_PX}px + env(safe-area-inset-bottom, 0px))`
    )
  })
})
