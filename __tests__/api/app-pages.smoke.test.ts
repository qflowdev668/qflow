/**
 * @jest-environment node
 */

/** Smoke-import thin app pages so they contribute to coverage. */
describe("App page modules", () => {
  it("loads staff page", async () => {
    await expect(import("@/app/staff/page")).resolves.toBeDefined()
  })
  it("loads staff serving page", async () => {
    await expect(import("@/app/staff/serving/page")).resolves.toBeDefined()
  })
  it("loads admin page", async () => {
    await expect(import("@/app/admin/page")).resolves.toBeDefined()
  })
  it("loads status page", async () => {
    await expect(import("@/app/status/page")).resolves.toBeDefined()
  })
  it("loads login page", async () => {
    await expect(import("@/app/login/page")).resolves.toBeDefined()
  })
  it("loads onboarding page", async () => {
    await expect(import("@/app/onboarding/page")).resolves.toBeDefined()
  })
  it("loads home page", async () => {
    await expect(import("@/app/home/page")).resolves.toBeDefined()
  })
  it("loads queue page", async () => {
    await expect(import("@/app/queue/page")).resolves.toBeDefined()
  })
  it("loads map page", async () => {
    await expect(import("@/app/map/page")).resolves.toBeDefined()
  })
  it("loads help page", async () => {
    await expect(import("@/app/help/page")).resolves.toBeDefined()
  })
  it("loads rate page", async () => {
    await expect(import("@/app/rate/page")).resolves.toBeDefined()
  })
  it("loads register page", async () => {
    await expect(import("@/app/register/page")).resolves.toBeDefined()
  })
  it("loads profile page", async () => {
    await expect(import("@/app/profile/page")).resolves.toBeDefined()
  })
  it("loads notifications page", async () => {
    await expect(import("@/app/notifications/page")).resolves.toBeDefined()
  })
})
