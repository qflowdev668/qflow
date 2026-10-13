import { test, expect } from "@playwright/test"

const screens = [
  { name: "galaxy-a", width: 360, height: 800 },
  { name: "iphone-mini", width: 375, height: 812 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "iphone-11", width: 414, height: 896 },
  { name: "ipad", width: 768, height: 1024 },
  { name: "ipad-air", width: 820, height: 1180 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "full-hd", width: 1920, height: 1080 },
  { name: "qhd", width: 2560, height: 1440 },
  { name: "uhd", width: 3840, height: 2160 },
]

test.describe("Screen sizes", () => {
  test("login is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 })
    await page.goto("/login")
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeLessThan(500)
    await expect(page.locator("body")).toBeVisible()
  })

  for (const screen of screens) {
    test(`login fits ${screen.name} (${screen.width}×${screen.height}) without horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: screen.width, height: screen.height })
      await page.goto("/login")
      await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible()

      const fit = await page.evaluate(() => {
        const doc = document.documentElement
        const shell = document.querySelector(".max-w-qflow")
        const shellWidth = shell ? shell.getBoundingClientRect().width : 0
        return {
          overflow: doc.scrollWidth - doc.clientWidth,
          shellWidth,
          viewport: doc.clientWidth,
        }
      })

      expect(fit.overflow).toBeLessThanOrEqual(1)
      expect(fit.shellWidth).toBeGreaterThan(screen.width - 8)
      expect(fit.shellWidth).toBeLessThanOrEqual(fit.viewport + 1)
    })
  }
})
