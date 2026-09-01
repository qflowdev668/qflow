import { defineConfig, devices } from "@playwright/test"
import { config as loadEnv } from "dotenv"
import { resolve } from "node:path"

loadEnv({ path: resolve(__dirname, ".env.local"), override: true })

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: "http://localhost:8000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:8000/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
