import {
  VISIT_RATING_WINDOW_MS,
  RATE_DENIED_MESSAGE,
  assertQueueEntryRateable,
  findRateableVisit,
} from "@/lib/visit-rating"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

describe("Visit rating guard", () => {
  it("uses a 2-hour rating window", () => {
    expect(VISIT_RATING_WINDOW_MS).toBe(2 * 60 * 60 * 1000)
  })

  it("exposes a clear denied message", () => {
    expect(RATE_DENIED_MESSAGE).toMatch(/served/i)
  })

  function mockClient(handlers: {
    entry?: Record<string, unknown> | null
    rating?: { id: string } | null
  }) {
    const maybeSingle = jest.fn()
    maybeSingle
      .mockResolvedValueOnce({ data: handlers.entry ?? null, error: null })
      .mockResolvedValueOnce({ data: handlers.rating ?? null, error: null })

    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle,
    }

    return {
      from: jest.fn(() => chain),
    } as unknown as SupabaseClient<Database>
  }

  it("findRateableVisit returns null when not served", async () => {
    const supabase = mockClient({
      entry: {
        id: "e1",
        location_id: "loc",
        status: "waiting",
        served_at: null,
        locations: { name: "Clinic" },
      },
    })
    await expect(findRateableVisit(supabase, "user-1")).resolves.toBeNull()
  })

  it("findRateableVisit returns visit when served within window and unrated", async () => {
    const servedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const supabase = mockClient({
      entry: {
        id: "e1",
        location_id: "loc",
        status: "served",
        served_at: servedAt,
        locations: { name: "Hillbrow Clinic" },
      },
      rating: null,
    })
    const visit = await findRateableVisit(supabase, "user-1")
    expect(visit).toEqual({
      queueEntryId: "e1",
      locationId: "loc",
      locationName: "Hillbrow Clinic",
      servedAt,
    })
  })

  it("assertQueueEntryRateable rejects expired window", async () => {
    const servedAt = new Date(Date.now() - VISIT_RATING_WINDOW_MS - 1000).toISOString()
    const supabase = mockClient({
      entry: {
        id: "e1",
        location_id: "loc",
        status: "served",
        served_at: servedAt,
        user_id: "user-1",
        locations: { name: "Clinic" },
      },
    })
    const result = await assertQueueEntryRateable(supabase, "user-1", "e1")
    expect(result.ok).toBe(false)
  })

  it("assertQueueEntryRateable rejects already rated", async () => {
    const servedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const supabase = mockClient({
      entry: {
        id: "e1",
        location_id: "loc",
        status: "served",
        served_at: servedAt,
        user_id: "user-1",
        locations: { name: "Clinic" },
      },
      rating: { id: "r1" },
    })
    const result = await assertQueueEntryRateable(supabase, "user-1", "e1")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/already rated/i)
    }
  })

  it("handles null served_at gracefully", async () => {
    const result = await assertQueueEntryRateable(
      mockClient({
        entry: {
          id: "e1",
          location_id: "loc",
          status: "served",
          served_at: null,
          user_id: "user-1",
          locations: { name: "Clinic" },
        },
      }),
      "user-1",
      "e1"
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(RATE_DENIED_MESSAGE)
  })

  it("handles missing / non-served status gracefully", async () => {
    const result = await assertQueueEntryRateable(
      mockClient({
        entry: {
          id: "e1",
          location_id: "loc",
          status: undefined,
          served_at: new Date().toISOString(),
          user_id: "user-1",
          locations: { name: "Clinic" },
        },
      }),
      "user-1",
      "e1"
    )
    expect(result.ok).toBe(false)
  })

  it("rejects when entry belongs to another user", async () => {
    const result = await assertQueueEntryRateable(
      mockClient({
        entry: {
          id: "e1",
          location_id: "loc",
          status: "served",
          served_at: new Date().toISOString(),
          user_id: "other-user",
          locations: { name: "Clinic" },
        },
      }),
      "user-1",
      "e1"
    )
    expect(result.ok).toBe(false)
  })

  it("rejects when entry is missing", async () => {
    const result = await assertQueueEntryRateable(
      mockClient({ entry: null }),
      "user-1",
      "missing"
    )
    expect(result.ok).toBe(false)
  })

  it("returns null from findRateableVisit when already rated", async () => {
    const servedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const visit = await findRateableVisit(
      mockClient({
        entry: {
          id: "e1",
          location_id: "loc",
          status: "served",
          served_at: servedAt,
          locations: { name: "Clinic" },
        },
        rating: { id: "r1" },
      }),
      "user-1"
    )
    expect(visit).toBeNull()
  })

  it("returns null from findRateableVisit when window expired", async () => {
    const servedAt = new Date(
      Date.now() - VISIT_RATING_WINDOW_MS - 5000
    ).toISOString()
    const visit = await findRateableVisit(
      mockClient({
        entry: {
          id: "e1",
          location_id: "loc",
          status: "served",
          served_at: servedAt,
          locations: { name: "Clinic" },
        },
      }),
      "user-1"
    )
    expect(visit).toBeNull()
  })

  it("findRateableVisit returns null when entry query errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "db error" },
    })
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle,
      })),
    } as unknown as SupabaseClient<Database>

    await expect(findRateableVisit(supabase, "user-1")).resolves.toBeNull()
  })

  it("findRateableVisit defaults location name when relation missing", async () => {
    const servedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const visit = await findRateableVisit(
      mockClient({
        entry: {
          id: "e1",
          location_id: "loc",
          status: "served",
          served_at: servedAt,
          locations: null,
        },
        rating: null,
      }),
      "user-1"
    )
    expect(visit?.locationName).toBe("Location")
  })
})
