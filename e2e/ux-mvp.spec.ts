import { test, expect } from "@playwright/test"

/**
 * One real-browser check the unit journey cannot prove:
 * the onboarding primary button stays in the same spot.
 */
test.describe("Onboarding action stays put", () => {
  test("Next stays in the footer across steps", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("qflow_onboarding_done")
    })
    await page.goto("/onboarding")

    const footer = page.getByTestId("user-screen-layout-footer")
    await expect(footer).toBeVisible({ timeout: 15_000 })

    const next = footer.getByRole("button", { name: /next/i })
    await expect(next).toBeVisible()
    const first = await footer.boundingBox()
    expect(first).not.toBeNull()

    await next.click()
    await expect(footer.getByRole("button", { name: /next/i })).toBeVisible()
    const second = await footer.boundingBox()
    expect(second).not.toBeNull()
    expect(Math.abs((first?.y ?? 0) - (second?.y ?? 0))).toBeLessThan(12)
    expect(Math.abs((first?.height ?? 0) - (second?.height ?? 0))).toBeLessThan(12)

    await footer.getByRole("button", { name: /next/i }).click()
    await footer.getByRole("button", { name: /next/i }).click()
    await expect(footer.getByRole("button", { name: /start/i })).toBeVisible()
    const last = await footer.boundingBox()
    expect(Math.abs((first?.y ?? 0) - (last?.y ?? 0))).toBeLessThan(12)
  })
})
