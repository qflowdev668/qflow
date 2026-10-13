import { render, screen, act } from "@testing-library/react"
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
import { OfflineBanner } from "@/components/qflow/offline-banner"
import { PasswordRules } from "@/components/qflow/password-rules"

const mockLocation: Location = {
  id: "loc-001",
  name: "Hillbrow Clinic",
  type: "clinic",
  address: "123 Pretoria St, Hillbrow, Johannesburg",
  distance: "1.2 km",
  queueCount: 12,
  waitTime: 25,
  capacity: 50,
  isOpen: true,
  coordinates: { lat: -26.18, lng: 28.04 },
}

describe("LocationCard", () => {
  it("renders location name", () => {
    render(<LocationCard location={mockLocation} onClick={jest.fn()} />)
    expect(screen.getByText("Hillbrow Clinic")).toBeInTheDocument()
  })

  it("renders queue count", () => {
    render(<LocationCard location={mockLocation} onClick={jest.fn()} />)
    expect(screen.getAllByText(/12/).length).toBeGreaterThan(0)
  })

  it("renders Open when open", () => {
    render(<LocationCard location={mockLocation} onClick={jest.fn()} />)
    expect(screen.getByText(/open/i)).toBeInTheDocument()
  })

  it("renders Closed when closed", () => {
    render(
      <LocationCard
        location={{ ...mockLocation, isOpen: false }}
        onClick={jest.fn()}
      />
    )
    expect(screen.getByText(/closed/i)).toBeInTheDocument()
  })

  it("is keyboard focusable", () => {
    const { container } = render(
      <LocationCard location={mockLocation} onClick={jest.fn()} />
    )
    const card = container.querySelector('[role="button"]')
    expect(card).toBeTruthy()
    ;(card as HTMLElement).focus()
    expect(document.activeElement).toBe(card)
  })
})

describe("OfflineBanner", () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    })
  })

  it("does not show offline copy when online", () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    })
    render(<OfflineBanner />)
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })

  it("shows offline message when offline", () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    })
    render(<OfflineBanner />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })

  it("shows back online after offline then online events", async () => {
    let online = true
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => online,
    })
    render(<OfflineBanner />)

    await act(async () => {
      online = false
      window.dispatchEvent(new Event("offline"))
    })
    expect(screen.getByText(/offline/i)).toBeInTheDocument()

    await act(async () => {
      online = true
      window.dispatchEvent(new Event("online"))
    })
    expect(screen.getByText(/back online/i)).toBeInTheDocument()
  })
})

describe("PasswordRules", () => {
  const labels = {
    passwordRuleLength: "12+ characters",
    passwordRuleLower: "Lowercase",
    passwordRuleUpper: "Uppercase",
    passwordRuleNumber: "Number",
    passwordRuleSymbol: "Symbol",
  }

  it("renders all rule labels", () => {
    render(<PasswordRules password="" labels={labels} />)
    expect(screen.getByText("12+ characters")).toBeInTheDocument()
    expect(screen.getByText("Lowercase")).toBeInTheDocument()
    expect(screen.getByText("Uppercase")).toBeInTheDocument()
  })
})
