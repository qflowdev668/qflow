import { test, expect } from "@playwright/test"

test.describe("Status page", () => {
  test("loads publicly", async ({ page }) => {
    await page.goto("/status")
    await expect(page).toHaveURL(/\/status\/?$/)
    await expect(page.locator("body")).toBeVisible()
  })

  test("shows component health labels", async ({ page }) => {
    await page.goto("/status")
    await expect(page.getByText(/app|database|auth/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
