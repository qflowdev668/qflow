/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { UserAvatar } from "@/components/qflow/user-avatar"

describe("UserAvatar", () => {
  it("renders photo when avatarUrl is set", () => {
    render(<UserAvatar name="Bongani Mathew Miya" avatarUrl="https://example.com/a.jpg" />)
    expect(screen.getByTestId("user-avatar")).toHaveAttribute("data-has-photo", "true")
    expect(screen.getByTestId("user-avatar-photo")).toHaveAttribute(
      "src",
      "https://example.com/a.jpg"
    )
    expect(screen.queryByTestId("user-avatar-initials")).not.toBeInTheDocument()
  })

  it("renders initials when avatarUrl is unset", () => {
    render(<UserAvatar name="Bongani Mathew Miya" />)
    expect(screen.getByTestId("user-avatar")).toHaveAttribute("data-has-photo", "false")
    expect(screen.getByTestId("user-avatar-initials")).toHaveTextContent("BMM")
  })
})
