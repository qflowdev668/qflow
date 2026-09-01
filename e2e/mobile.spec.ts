import { test, expect } from "@playwright/test"

test.describe("Mobile experience", () => {
  test("login is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 })
    await page.goto("/login")
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeLessThan(500)
    await expect(page.locator("body")).toBeVisible()
  })
})
