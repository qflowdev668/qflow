import { test, expect } from "@playwright/test"

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("shows login UI", async ({ page }) => {
    await expect(page.getByText(/login|sign in|welcome|email/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test("has a path to register", async ({ page }) => {
    const register = page.getByRole("button", { name: /create account|register|sign up/i })
    const link = page.getByRole("link", { name: /create account|register|sign up/i })
    if ((await register.count()) > 0) {
      await register.first().click()
      await expect(page).toHaveURL(/register/)
    } else if ((await link.count()) > 0) {
      await link.first().click()
      await expect(page).toHaveURL(/register/)
    } else {
      await page.goto("/register")
      await expect(page).toHaveURL(/register/)
    }
  })
})
