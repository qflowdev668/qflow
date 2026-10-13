import { test, expect } from "@playwright/test"

test.describe("Ask QFlow", () => {
  test("Help assistant shows a mocked Llama reply", async ({ page }) => {
    await page.route("**/api/assistant/model", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }),
      })
    })
    await page.route("**/api/assistant/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "You are number 4 at Netcare Clinic Rosebank. Three people are ahead of you.",
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        }),
      })
    })

    await page.goto("/help")
    await expect(page.getByTestId("ask-qflow-toggle")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("powered-by-llama")).toHaveText("Powered by Llama")

    await page.getByTestId("ask-qflow-toggle").click()
    await expect(page.getByTestId("ask-qflow-model")).toContainText(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    )
    await page.getByTestId("ask-qflow-input").fill("How long is my wait?")
    await page.getByTestId("ask-qflow-send").click()

    await expect(page.getByTestId("ask-qflow-reply")).toHaveText(
      "You are number 4 at Netcare Clinic Rosebank. Three people are ahead of you.",
      { timeout: 15_000 }
    )
  })
})
