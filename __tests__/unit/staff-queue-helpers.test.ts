import {
  formatTicketNumber,
  buildServingPayload,
  claimStaffEntry,
} from "@/lib/staff-queue-helpers"

describe("staff-queue-helpers", () => {
  it("formatTicketNumber pads position", () => {
    expect(formatTicketNumber(7)).toBe("#007")
  })

  it("buildServingPayload includes ticket number", () => {
    const payload = buildServingPayload(
      {
        id: "e1",
        user_id: null,
        location_id: "loc-1",
        position: 7,
        status: "serving",
        priority: "standard",
        priority_category: null,
        is_walk_in: true,
        walk_in_name: "Doli",
        walk_in_notes: null,
        joined_at: new Date().toISOString(),
        served_at: null,
        serving_by: null,
        serving_started_at: null,
      },
      "Doli",
      null
    )
    expect(payload.ticketNumber).toBe("#007")
    expect(payload.customerName).toBe("Doli")
  })
})
