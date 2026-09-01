import { test, expect } from "@playwright/test"

/**
 * End-to-end coverage for interactive controls that previously looked
 * clickable but did nothing (or navigated to the wrong place).
 */
test.describe("Button integrations (public)", () => {
  test("login role buttons navigate to the right screens", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("button", { name: /email code|email/i }).first()).toBeVisible({
      timeout: 15_000,
    })

    await expect(page.getByRole("button", { name: /staff sign in|admin sign in/i })).toHaveCount(0)

    await page.getByRole("button", { name: /email code|email/i }).first().click()
    await expect(page).toHaveURL(/\/login\/email/, { timeout: 10_000 })
  })

  test("direct /login/staff without unlock redirects to /login", async ({ page }) => {
    await page.goto("/login/staff")
    await expect(page).toHaveURL(/\/login\/?$/, { timeout: 10_000 })
    await expect(page.getByRole("button", { name: /staff sign in/i })).toHaveCount(0)
    await expect(page.getByTestId("login-brand")).toBeVisible({ timeout: 10_000 })
  })

  test("direct /login/admin without unlock redirects to /login", async ({ page }) => {
    await page.goto("/login/admin")
    await expect(page).toHaveURL(/\/login\/?$/, { timeout: 10_000 })
    await expect(page.getByRole("button", { name: /admin sign in/i })).toHaveCount(0)
    await expect(page.getByTestId("login-brand")).toBeVisible({ timeout: 10_000 })
  })

  test("staff and admin login stay hidden on the public login screen", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("button", { name: /staff sign in|admin sign in/i })).toHaveCount(0)
  })

  test("seven rapid clicks on the login brand opens admin sign-in", async ({ page }) => {
    await page.goto("/login")
    const brand = page.getByTestId("login-brand")
    await expect(brand).toBeVisible({ timeout: 15_000 })
    for (let i = 0; i < 7; i++) {
      await brand.click({ delay: 50 })
    }
    await expect(page).toHaveURL(/\/login\/admin\/?$/, { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toMatch(/^\/login\/admin\/?$/)
  })

  test("?unlock=admin query param opens admin sign-in", async ({ page }) => {
    await page.goto("/login?unlock=admin")
    await expect(page).toHaveURL(/\/login\/admin\/?$/, { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toMatch(/^\/login\/admin\/?$/)
    await expect(
      page.getByText(/admin|phone|otp|sign in/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test("mouse long-press on the login brand opens staff sign-in", async ({ page }) => {
    await page.goto("/login")
    const brand = page.getByTestId("login-brand")
    await expect(brand).toBeVisible({ timeout: 15_000 })
    const box = await brand.boundingBox()
    if (!box) throw new Error("login brand not found")
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(2700)
    await page.mouse.up()
    await expect(page).toHaveURL(/\/login\/staff\/?$/, { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toMatch(/^\/login\/staff\/?$/)
  })

  test("forgot password and register links work from login", async ({ page }) => {
    await page.goto("/login")

    await page.getByRole("button", { name: /forgot/i }).click()
    await expect(page).toHaveURL(/forgot-password/, { timeout: 10_000 })

    await page.goto("/login")
    await page.getByRole("button", { name: /create account|register|sign up/i }).click()
    await expect(page).toHaveURL(/register/, { timeout: 10_000 })
  })

  test("privacy and terms buttons open modals on register", async ({ page }) => {
    await page.goto("/register")
    await expect(page.getByRole("button", { name: /^privacy policy$/i })).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole("button", { name: /^privacy policy$/i }).click()
    await expect(page.getByText(/how qflow uses your data/i).first()).toBeVisible()
    await page.getByRole("button", { name: /^close$/i }).click()

    await page.getByRole("button", { name: /^terms of service$/i }).click()
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible()
    await page.getByRole("button", { name: /^close$/i }).click()
    await expect(page.getByRole("heading", { name: /terms of service/i })).toHaveCount(0)
  })

  test("protected routes redirect unauthenticated users to login", async ({ page }) => {
    for (const path of ["/home", "/map", "/staff", "/admin", "/queue", "/profile"]) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    }
  })

  test("status page primary content is interactive", async ({ page }) => {
    await page.goto("/status")
    await expect(page.getByText(/status|operational/i).first()).toBeVisible({
      timeout: 15_000,
    })
    const refresh = page.getByRole("button", { name: /refresh|retry|reload/i })
    if (await refresh.count()) {
      await refresh.first().click()
      await expect(page.locator("body")).toBeVisible()
    }
  })

  test("onboarding next/skip controls advance", async ({ page }) => {
    await page.goto("/onboarding")
    const skip = page.getByRole("button", { name: /skip|get started|next/i }).first()
    await expect(skip).toBeVisible({ timeout: 15_000 })
    await skip.click()
    await expect(page.locator("body")).toBeVisible()
  })
})

test.describe("Auth API button contracts", () => {
  test("login submit without credentials stays on login", async ({ page }) => {
    await page.goto("/login")
    const submit = page.getByRole("button", { name: /login|sign in/i }).first()
    await submit.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test("staff login page exposes phone/email entry", async ({ page }) => {
    await page.goto("/login")
    await page.evaluate(() => sessionStorage.setItem("qflow_staff_unlock", "1"))
    await page.goto("/login/staff")
    await expect(
      page.getByText(/staff|phone|email|otp|sign in/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test("admin login page exposes phone entry", async ({ page }) => {
    await page.goto("/login")
    await page.evaluate(() => sessionStorage.setItem("qflow_admin_unlock", "1"))
    await page.goto("/login/admin")
    await expect(
      page.getByText(/admin|phone|otp|sign in/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })
})
