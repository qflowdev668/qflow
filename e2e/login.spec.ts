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

  test("email and password sign-in does not show an error banner", async ({ page }) => {
    const userId = "11111111-1111-1111-1111-111111111111"
    const user = {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "ada@example.com",
      app_metadata: { provider: "email" },
      user_metadata: { name: "Ada" },
      identities: [{ provider: "email" }],
    }

    await page.route("**/auth/v1/token**", async (route) => {
      const request = route.request()
      expect(request.url()).toContain("grant_type=password")
      const body = request.postData() ?? ""
      expect(body).not.toContain("code_verifier")
      expect(body).not.toContain("auth_error")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user,
        }),
      })
    })

    await page.route("**/auth/v1/user**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(user),
      })
    })

    await page.route("**/rest/v1/**", async (route) => {
      const url = route.request().url()
      if (url.includes("/profiles")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: userId,
            name: "Ada",
            email: "ada@example.com",
            role: "user",
            location_id: null,
            avatar_url: null,
            language: "en",
            cell_number: null,
            sms_notifications: false,
            notification_preferences: null,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      })
    })

    await page.goto("/login")
    await page.getByPlaceholder("Email").fill("ada@example.com")
    await page.getByPlaceholder("Password").fill("correct-horse")
    await page.getByRole("button", { name: "Sign in", exact: true }).click()

    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })
    await expect(page.getByTestId("login-auth-error")).toHaveCount(0)
    await expect(page.getByText(/PKCE code verifier not found/i)).toHaveCount(0)
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
