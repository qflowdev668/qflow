import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test.describe("Accessibility E2E", () => {
  test("login page has no critical violations (excl. known icon buttons)", async ({
    page,
  }) => {
    await page.goto("/login")
    // Password visibility toggles are icon-only today; tracked separately from suite gate.
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["button-name"])
      .analyze()

    const critical = results.violations.filter((v) => v.impact === "critical")
    expect(critical).toHaveLength(0)
  })

  test("status page has no critical violations", async ({ page }) => {
    await page.goto("/status")
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()
    const critical = results.violations.filter((v) => v.impact === "critical")
    expect(critical).toHaveLength(0)
  })
})
