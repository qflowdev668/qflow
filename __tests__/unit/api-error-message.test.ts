import { formatApiErrorMessage } from "@/lib/api-client"

describe("formatApiErrorMessage", () => {
  it("reads top-level error", () => {
    expect(formatApiErrorMessage({ error: "Nope" })).toBe("Nope")
  })

  it("reads string detail", () => {
    expect(formatApiErrorMessage({ detail: "Already in queue" })).toBe("Already in queue")
  })

  it("reads nested session_expired detail object", () => {
    expect(
      formatApiErrorMessage({
        detail: { error: "Your session has expired.", code: "session_expired" },
      })
    ).toBe("Your session has expired.")
  })

  it("reads validation detail arrays", () => {
    expect(
      formatApiErrorMessage({
        detail: [{ msg: "Field required", loc: ["body", "locationId"] }],
      })
    ).toBe("Field required")
  })

  it("falls back when empty", () => {
    expect(formatApiErrorMessage({}, "Could not join the queue.")).toBe(
      "Could not join the queue."
    )
  })

  it("hides stack traces and storage internals", () => {
    expect(
      formatApiErrorMessage(
        { detail: "TypeError: Cannot read properties of undefined (reading 'id')" },
        "Try again."
      )
    ).toBe("Try again.")
    expect(formatApiErrorMessage({ error: "Bucket not found" }, "Could not update photo.")).toBe(
      "Could not update photo."
    )
  })
})
