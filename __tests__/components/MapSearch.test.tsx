/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  filterMapLocationSuggestions,
  MapLocationSearch,
} from "@/components/qflow/map-location-search"
import type { Location } from "@/lib/app-context"
import type { TranslationKeys } from "@/lib/i18n"

const t = {
  searchLocations: "Search...",
  noMatchingLocations: "No matching locations",
  queueFull: "Full",
  nearlyFull: "Nearly full",
  almostFull: "Almost full",
  capacityModerate: "Medium",
  lowWait: "Low",
} as unknown as TranslationKeys

const locations: Location[] = [
  {
    id: "loc-netcare",
    name: "Netcare Clinic Rosebank",
    address: "14 Sturdee Ave, Rosebank",
    type: "clinic",
    queueCount: 2,
    capacity: 40,
    waitTime: 4,
    isOpen: true,
    distance: "2 km",
    coordinates: { lat: -26.146, lng: 28.043 },
  },
  {
    id: "loc-absa",
    name: "ABSA Bank Sandton",
    address: "Sandton City, Rivonia Rd",
    type: "bank",
    queueCount: 30,
    capacity: 40,
    waitTime: 40,
    isOpen: true,
    distance: "5 km",
    coordinates: { lat: -26.107, lng: 28.056 },
  },
  {
    id: "loc-home",
    name: "Home Affairs Johannesburg",
    address: "Harrison St",
    type: "government",
    queueCount: 5,
    capacity: 50,
    waitTime: 10,
    isOpen: true,
    distance: "1 km",
    coordinates: { lat: -26.204, lng: 28.047 },
  },
]

describe("filterMapLocationSuggestions", () => {
  it("matches name and address case-insensitively and caps results", () => {
    expect(filterMapLocationSuggestions(locations, "netcare").map((l) => l.id)).toEqual([
      "loc-netcare",
    ])
    expect(filterMapLocationSuggestions(locations, "ROSEBANK").map((l) => l.id)).toEqual([
      "loc-netcare",
    ])
    expect(filterMapLocationSuggestions(locations, "  sandton ").map((l) => l.id)).toEqual([
      "loc-absa",
    ])
    expect(filterMapLocationSuggestions(locations, "")).toEqual([])
  })
})

describe("MapLocationSearch", () => {
  it("shows matching results when typing a partial location name", async () => {
    const user = userEvent.setup()
    const onQueryChange = jest.fn()
    const onSelect = jest.fn()

    const { rerender } = render(
      <MapLocationSearch
        locations={locations}
        query=""
        onQueryChange={onQueryChange}
        onSelectLocation={onSelect}
        t={t}
      />
    )

    await user.type(screen.getByTestId("map-search-input"), "net")
    expect(onQueryChange).toHaveBeenCalled()

    rerender(
      <MapLocationSearch
        locations={locations}
        query="net"
        onQueryChange={onQueryChange}
        onSelectLocation={onSelect}
        t={t}
      />
    )

    expect(screen.getByTestId("map-search-suggestions")).toBeInTheDocument()
    expect(screen.getByTestId("map-search-result-loc-netcare")).toHaveTextContent(
      "Netcare Clinic Rosebank"
    )
    expect(screen.getByText("14 Sturdee Ave, Rosebank")).toBeInTheDocument()
    expect(screen.queryByTestId("map-search-empty")).not.toBeInTheDocument()
  })

  it("shows No matching locations for a non-matching query", () => {
    render(
      <MapLocationSearch
        locations={locations}
        query="xyz123"
        onQueryChange={jest.fn()}
        onSelectLocation={jest.fn()}
        t={t}
      />
    )
    // Focus to open dropdown
    fireEvent.focus(screen.getByTestId("map-search-input"))
    expect(screen.getByTestId("map-search-empty")).toHaveTextContent("No matching locations")
  })

  it("selecting a result calls the same handler as a pin click and clears the query", async () => {
    const user = userEvent.setup()
    const onQueryChange = jest.fn()
    const onSelect = jest.fn()

    render(
      <MapLocationSearch
        locations={locations}
        query="netcare"
        onQueryChange={onQueryChange}
        onSelectLocation={onSelect}
        t={t}
      />
    )
    fireEvent.focus(screen.getByTestId("map-search-input"))

    await user.click(screen.getByTestId("map-search-result-loc-netcare"))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "loc-netcare", name: "Netcare Clinic Rosebank" })
    )
    expect(onQueryChange).toHaveBeenCalledWith("")
  })
})
