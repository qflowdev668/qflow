import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getTranslations } from "@/lib/i18n"
import type { Location } from "@/lib/app-context"

jest.mock("@/hooks/use-t", () => ({
  useT: () => getTranslations("en"),
  fmt: (template: string, vars: Record<string, string | number>) => {
    let result = template
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{${key}}`, String(value))
    }
    return result
  },
}))

import { LocationCard } from "@/components/qflow/location-card"

const location: Location = {
  id: "loc-001",
  name: "Hillbrow Clinic",
  type: "clinic",
  address: "123 Pretoria St",
  distance: "1 km",
  queueCount: 5,
  waitTime: 10,
  capacity: 50,
  isOpen: true,
  coordinates: { lat: 0, lng: 0 },
}

describe("Keyboard navigation", () => {
  it("activates LocationCard with Enter", async () => {
    const onClick = jest.fn()
    const user = userEvent.setup()
    const { container } = render(
      <LocationCard location={location} onClick={onClick} />
    )
    const card = container.querySelector('[role="button"]') as HTMLElement
    card.focus()
    await user.keyboard("{Enter}")
    expect(onClick).toHaveBeenCalled()
  })

  it("activates LocationCard with Space", async () => {
    const onClick = jest.fn()
    const user = userEvent.setup()
    const { container } = render(
      <LocationCard location={location} onClick={onClick} />
    )
    const card = container.querySelector('[role="button"]') as HTMLElement
    card.focus()
    await user.keyboard(" ")
    expect(onClick).toHaveBeenCalled()
  })

  it("native button responds to Enter", async () => {
    const onClick = jest.fn()
    const user = userEvent.setup()
    render(
      <button type="button" onClick={onClick}>
        Test
      </button>
    )
    screen.getByRole("button", { name: "Test" }).focus()
    await user.keyboard("{Enter}")
    expect(onClick).toHaveBeenCalled()
  })
})
