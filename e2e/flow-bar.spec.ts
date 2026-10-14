import { test, expect } from "@playwright/test"

/**
 * Flow Bar appears after joining a queue. Full join needs auth + live API;
 * this suite covers the chrome contract and a demo-path expand when possible.
 */
test.describe("Flow Bar", () => {
  test("does not show Flow Bar on public login without an active queue", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByTestId("flow-bar")).toHaveCount(0)
    await expect(page.getByTestId("flow-bar-expanded")).toHaveCount(0)
  })

  test("after join (when signed in), Flow Bar expands and reuses join panel", async ({
    page,
  }) => {
    test.setTimeout(90_000)

    await page.goto("/home")
    const joinTrigger = page.getByRole("button", { name: /join the line|join/i }).first()
    const outcome = await Promise.race([
      page.waitForURL(/\/login/, { timeout: 15_000 }).then(() => "login" as const).catch(() => "timeout" as const),
      joinTrigger.waitFor({ state: "visible", timeout: 15_000 }).then(() => "home" as const).catch(() => "timeout" as const),
    ])
    if (outcome !== "home") {
      test.skip(true, "Requires signed-in customer session to join a queue")
      return
    }

    await joinTrigger.click()
    const joinBtn = page.getByRole("button", { name: /^join the line$|^join$/i }).last()
    if (await joinBtn.isVisible().catch(() => false)) {
      await joinBtn.click()
    }

    const flowBar = page.getByTestId("flow-bar")
    await expect(flowBar).toBeVisible({ timeout: 20_000 })

    await flowBar.click()
    const expanded = page.getByTestId("flow-bar-expanded")
    await expect(expanded).toBeVisible()
    await expect(page.getByTestId("join-queue-panel")).toBeVisible()
    await expect(page.getByRole("button", { name: /leave the line|leave/i })).toBeVisible()

    await page.getByLabel(/close queue details/i).click()
    await expect(page.getByTestId("flow-bar")).toBeVisible()
    await expect(page.getByTestId("flow-bar-expanded")).toHaveCount(0)
  })
})
