import { render, screen, act } from "@testing-library/react"
import { RollerDigit } from "@/components/qflow/roller-digit"

const mockUseReducedMotion = jest.fn(() => false)

jest.mock("framer-motion", () => {
  const React = require("react")
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      span: ({
        children,
        className,
      }: {
        children?: React.ReactNode
        className?: string
      }) => <span className={className}>{children}</span>,
    },
    useReducedMotion: () => mockUseReducedMotion(),
  }
})

describe("RollerDigit", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false)
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders static value correctly", () => {
    render(<RollerDigit value={12} />)
    expect(screen.getByTestId("roller-digit")).toHaveAttribute("data-value", "12")
    expect(screen.getByTestId("roller-digit")).toHaveTextContent("12")
  })

  it("marks only changed characters when value updates", () => {
    const { rerender } = render(<RollerDigit value="10" />)
    expect(screen.getByTestId("roller-digit")).toHaveAttribute("data-value", "10")

    rerender(<RollerDigit value="11" />)

    const slots = screen.getByTestId("roller-digit").querySelectorAll("[data-changed]")
    const changed = Array.from(slots).filter((el) => el.getAttribute("data-changed") === "true")
    expect(changed.length).toBeGreaterThanOrEqual(1)
    expect(changed.length).toBeLessThan(slots.length)

    act(() => {
      jest.runOnlyPendingTimers()
    })
  })

  it("respects reduced-motion with no flash/animation markers lasting", () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { rerender } = render(<RollerDigit value="3" />)
    rerender(<RollerDigit value="4" />)
    act(() => {
      jest.runOnlyPendingTimers()
    })
    const slots = screen.getByTestId("roller-digit").querySelectorAll("[data-changed]")
    expect(Array.from(slots).every((el) => el.getAttribute("data-changed") === "false")).toBe(
      true
    )
    expect(screen.getByTestId("roller-digit")).toHaveAttribute("data-value", "4")
  })
})
