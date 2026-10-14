import { render, screen } from "@testing-library/react"
import { BrandLogo } from "@/components/qflow/brand-logo"

describe("BrandLogo", () => {
  it("renders the blue tile, the colour mark, and the colour wordmark", () => {
    const { rerender } = render(<BrandLogo variant="icon" />)
    const icon = screen.getByRole("img", { name: "QFlow" })
    expect(icon).toHaveAttribute("data-variant", "icon")
    expect(icon.innerHTML).toContain('fill="#1A3FD6"')
    expect(icon.innerHTML).toContain('stroke="#FFC83D"')

    rerender(<BrandLogo variant="mark" tone="light" />)
    const mark = screen.getByRole("img", { name: "QFlow" })
    expect(mark).toHaveAttribute("data-variant", "mark")
    expect(mark).toHaveAttribute("data-tone", "light")
    expect(mark.innerHTML).toContain('stroke="#1A3FD6"')
    expect(mark.innerHTML).toContain('stroke="#FFC83D"')

    rerender(<BrandLogo variant="wordmark" tone="light" />)
    const word = screen.getByRole("img", { name: "QFlow" })
    expect(word).toHaveAttribute("data-variant", "wordmark")
    expect(word).toHaveAttribute("data-tone", "light")
    expect(word.innerHTML).toContain('fill="#1A3FD6"')
    expect(word.getAttribute("viewBox")).toBe("-26.0 -148.5 622.5 215.3")
  })

  it("uses the reversed wordmark on dark backgrounds and the white mark", () => {
    const { rerender } = render(<BrandLogo variant="wordmark" tone="dark" />)
    const reversed = screen.getByRole("img", { name: "QFlow" })
    expect(reversed).toHaveAttribute("data-tone", "dark")
    expect(reversed.innerHTML).toContain('stroke="#FFFFFF"')
    expect(reversed.innerHTML).toContain('stroke="#FFC83D"')
    expect(reversed.innerHTML).not.toContain('stroke="#1A3FD6"')

    rerender(<BrandLogo variant="mark" tone="dark" />)
    const whiteMark = screen.getByRole("img", { name: "QFlow" })
    expect(whiteMark.innerHTML).toContain('stroke="#FFFFFF"')
    expect(whiteMark.innerHTML).not.toContain("#FFC83D")

    rerender(<BrandLogo variant="wordmark" tone="black" />)
    expect(screen.getByRole("img", { name: "QFlow" }).innerHTML).toContain('fill="#000000"')

    rerender(<BrandLogo variant="wordmark" tone="white" />)
    expect(screen.getByRole("img", { name: "QFlow" }).innerHTML).toContain('fill="#FFFFFF"')
  })
})
