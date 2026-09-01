import { test, expect } from "@playwright/test"

test.describe("Onboarding", () => {
  test("onboarding route is reachable", async ({ page }) => {
    await page.goto("/onboarding")
    await expect(page.locator("body")).toBeVisible()
    await expect(
      page.getByText(/find|location|queue|skip|next|get started/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })
})
