import { test, expect } from "@playwright/test"

/**
 * Map uses Mapbox GL (client-only) and requires a signed-in customer.
 * Without a session we assert the auth redirect; with a session, soft-check
 * canvas + pin when locations with coordinates are present.
 */
test.describe("Map (/map)", () => {
  test("unauthenticated /map redirects to login", async ({ page }) => {
    await page.goto("/map")
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })

  test("authenticated map shows canvas and opens join on pin click", async ({ page }) => {
    await page.goto("/map")
    if (page.url().includes("/login")) {
      test.skip(true, "Requires signed-in customer session for Mapbox map assertions")
    }

    const canvas = page.getByTestId("qflow-map-canvas")
    const missing = page.getByTestId("map-token-missing")
    await expect(canvas.or(missing)).toBeVisible({ timeout: 20_000 })

    if (await missing.isVisible().catch(() => false)) {
      test.skip(true, "NEXT_PUBLIC_MAPBOX_TOKEN was not baked into this build")
    }

    await expect(page.getByPlaceholder(/search|locations/i).first()).toBeVisible()
    await expect(page.getByText(/room|capacity|low|medium|high|full/i).first()).toBeVisible()

    const pin = page.locator("[data-testid^='map-pin-']").first()
    if ((await pin.count()) === 0) {
      test.skip(true, "No locations with coordinates in this environment")
    }

    await pin.click()
    await expect(
      page.getByRole("dialog").or(page.getByTestId("join-drawer")).or(page.getByText(/join the line|join/i).first())
    ).toBeVisible({ timeout: 10_000 })
  })

  test("search type-ahead selects a location like a pin tap", async ({ page }) => {
    await page.goto("/map")
    if (page.url().includes("/login")) {
      test.skip(true, "Requires signed-in customer session")
    }

    const canvas = page.getByTestId("qflow-map-canvas")
    const missing = page.getByTestId("map-token-missing")
    await expect(canvas.or(missing)).toBeVisible({ timeout: 20_000 })
    if (await missing.isVisible().catch(() => false)) {
      test.skip(true, "NEXT_PUBLIC_MAPBOX_TOKEN was not baked into this build")
    }

    const search = page.getByTestId("map-search-input")
    await expect(search).toBeVisible()
    await search.fill("netcare")

    const suggestion = page.getByTestId("map-search-suggestions")
    await expect(suggestion).toBeVisible({ timeout: 5_000 })

    const empty = page.getByTestId("map-search-empty")
    if (await empty.isVisible().catch(() => false)) {
      test.skip(true, "No Netcare location seeded in this environment")
    }

    const result = page.locator("[data-testid^='map-search-result-']").filter({
      hasText: /netcare/i,
    })
    await expect(result.first()).toBeVisible()
    await result.first().click()

    await expect(
      page.getByRole("dialog").or(page.getByTestId("join-queue-drawer")).or(page.getByText(/netcare|join the line|join/i).first())
    ).toBeVisible({ timeout: 10_000 })
    await expect(search).toHaveValue("")
  })
})
