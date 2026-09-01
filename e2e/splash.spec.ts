import { test, expect } from "@playwright/test"

test.describe("Splash & public pages", () => {
  test("splash shows QFlow branding", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("QFlow").first()).toBeVisible({ timeout: 15_000 })
  })

  test("status page loads without auth", async ({ page }) => {
    await page.goto("/status")
    await expect(page).toHaveURL(/status/)
    await expect(page.getByText(/status|operational|app/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
