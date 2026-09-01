/**
 * @jest-environment node
 *
 * Next.js route-handler API tests were removed when the backend moved to FastAPI.
 * API coverage lives in backend/tests/ (pytest). Run: npm run test:api:python
 */
describe("API test location", () => {
  it("points API coverage to FastAPI pytest", () => {
    expect(true).toBe(true)
  })
})
