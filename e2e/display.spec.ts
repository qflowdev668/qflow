import { test, expect } from "@playwright/test"

test.describe("Counter display", () => {
  const LOCATION_ID = "00000000-0000-0000-0000-000000000001"

  test("loads without auth and shows headers", async ({ page }) => {
    await page.goto(`/display/${LOCATION_ID}`)
    await expect(page.getByText(/now serving/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/recently called/i)).toBeVisible()
  })

  test("shows live indicator", async ({ page }) => {
    await page.goto(`/display/${LOCATION_ID}`)
    await expect(page.getByText(/live|reconnecting/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test("does not render main app bottom nav", async ({ page }) => {
    await page.goto(`/display/${LOCATION_ID}`)
    await expect(page.getByRole("navigation")).toHaveCount(0)
  })
})
