import { createBrowserClient } from "@supabase/ssr"
import { createClient, SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase/client"

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({ auth: {} })),
}))

describe("browser supabase client", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
  })

  it("creates one client and does not exchange codes from the URL", () => {
    const first = createClient()
    const second = createClient()

    expect(first).toBe(second)
    expect(createBrowserClient).toHaveBeenCalledTimes(1)
    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.objectContaining({
        isSingleton: true,
        auth: expect.objectContaining({
          flowType: "pkce",
          detectSessionInUrl: false,
          storageKey: SUPABASE_AUTH_STORAGE_KEY,
        }),
      })
    )
  })
})
