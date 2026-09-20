import {
  createDebouncedRunner,
  parseStaffQueueResponse,
  priorityRank,
  sortStaffQueueEntries,
  staffQueueErrorMessage,
} from "@/lib/staff-queue-pipe"

describe("staff queue pipe", () => {
  it("parses a successful staff queue payload", () => {
    const result = parseStaffQueueResponse(200, {
      ok: true,
      locationId: "loc-1",
      entries: [{ id: "q1", position: 1, priorityType: "standard" }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.locationId).toBe("loc-1")
      expect(Array.isArray(result.payload.entries)).toBe(true)
    }
  })

  it("surfaces 403 location assignment failures", () => {
    const result = parseStaffQueueResponse(403, {
      detail: "Your staff account has no location assigned. Ask an admin to assign your clinic.",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/location assigned/i)
    }
  })

  it("sorts emergency ahead of standard tickets", () => {
    const sorted = sortStaffQueueEntries([
      { position: 1, priorityType: "standard" },
      { position: 5, priorityType: "emergency" },
      { position: 2, priorityType: "fast-track" },
    ])
    expect(sorted.map((e) => e.priorityType)).toEqual([
      "emergency",
      "fast-track",
      "standard",
    ])
    expect(priorityRank("emergency")).toBeLessThan(priorityRank("standard"))
  })

  it("debounces rapid realtime bursts into one run", async () => {
    jest.useFakeTimers()
    const fn = jest.fn()
    const runner = createDebouncedRunner(250)
    runner.run(fn)
    runner.run(fn)
    runner.run(fn)
    expect(fn).not.toHaveBeenCalled()
    jest.advanceTimersByTime(250)
    expect(fn).toHaveBeenCalledTimes(1)
    runner.cancel()
    jest.useRealTimers()
  })

  it("maps auth failures to clear messages", () => {
    expect(staffQueueErrorMessage(401, null)).toMatch(/session expired/i)
    expect(staffQueueErrorMessage(500, null)).toMatch(/could not load/i)
  })
})
