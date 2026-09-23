import { test, expect } from "@playwright/test"

/**
 * Directions on /map require auth + geolocation + Mapbox.
 * Without a session we assert the redirect; with mocks we soft-check the UI.
 */
test.describe("Map directions", () => {
  test("unauthenticated /map redirects to login", async ({ page }) => {
    await page.goto("/map")
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })

  test("with mocked geolocation, pin → Directions shows route card", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"])
    await context.setGeolocation({ latitude: -26.1466, longitude: 28.0416 })

    await page.goto("/map")
    if (page.url().includes("/login")) {
      test.skip(true, "Requires signed-in customer session")
    }

    const canvas = page.getByTestId("qflow-map-canvas")
    const missing = page.getByTestId("map-token-missing")
    await expect(canvas.or(missing)).toBeVisible({ timeout: 20_000 })
    if (await missing.isVisible().catch(() => false)) {
      test.skip(true, "NEXT_PUBLIC_MAPBOX_TOKEN missing from build")
    }

    // Stub Directions API so CI is stable without live Mapbox billing.
    await page.route("**/directions/v5/mapbox/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: "Ok",
          routes: [
            {
              distance: 1200,
              duration: 900,
              geometry: {
                type: "LineString",
                coordinates: [
                  [28.0416, -26.1466],
                  [28.0437, -26.1461],
                ],
              },
            },
          ],
        }),
      })
    })

    const pin = page.locator("[data-testid^='map-pin-']").first()
    if ((await pin.count()) === 0) {
      test.skip(true, "No location pins in this environment")
    }
    await pin.click()

    const directions = page.getByTestId("directions-button")
    await expect(directions).toBeVisible({ timeout: 10_000 })
    await directions.click()

    const card = page.getByTestId("route-summary-card")
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText(/km|m|min/i)
    await expect(page.getByRole("button", { name: /open in maps/i })).toBeVisible()
  })
})
