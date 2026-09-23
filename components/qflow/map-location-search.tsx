"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { Location } from "@/lib/app-context"
import { getMapPinCapacityInfo } from "@/lib/capacity-i18n"
import type { TranslationKeys } from "@/lib/i18n"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

const MIN_QUERY_CHARS = 1
const MAX_SUGGESTIONS = 6

/** Case-insensitive substring match on name + address; capped for the dropdown. */
export function filterMapLocationSuggestions(
  locations: Location[],
  query: string,
  limit = MAX_SUGGESTIONS
): Location[] {
  const q = query.trim().toLowerCase()
  if (q.length < MIN_QUERY_CHARS) return []
  const matches: Location[] = []
  for (const loc of locations) {
    const name = loc.name.toLowerCase()
    const address = loc.address.toLowerCase()
    if (name.includes(q) || address.includes(q)) {
      matches.push(loc)
      if (matches.length >= limit) break
    }
  }
  return matches
}

type MapLocationSearchProps = {
  locations: Location[]
  query: string
  onQueryChange: (query: string) => void
  /** Same handler as map pin taps. */
  onSelectLocation: (location: Location) => void
  t: TranslationKeys
  trailing?: React.ReactNode
  className?: string
}

/**
 * Type-ahead over QFlow locations (pins dataset) — not Mapbox geocoding.
 */
export function MapLocationSearch({
  locations,
  query,
  onQueryChange,
  onSelectLocation,
  t,
  trailing,
  className,
}: MapLocationSearchProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const trimmed = query.trim()
  const suggestions = useMemo(
    () => filterMapLocationSuggestions(locations, trimmed),
    [locations, trimmed]
  )
  const showDropdown = open && trimmed.length >= MIN_QUERY_CHARS

  useEffect(() => {
    if (!showDropdown) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
    }
  }, [showDropdown])

  const handleSelect = (location: Location) => {
    onSelectLocation(location)
    onQueryChange("")
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn("relative", className)} data-testid="map-location-search">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={t.searchLocations}
        value={query}
        data-testid="map-search-input"
        onChange={(e) => {
          onQueryChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className={cn("h-12 border-0 bg-card pl-10 shadow-lg", trailing ? "pr-12" : "pr-4")}
      />
      {trailing}

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          data-testid="map-search-suggestions"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-card py-1 shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li
              className="px-3 py-3 text-sm text-muted-foreground"
              data-testid="map-search-empty"
              role="option"
              aria-disabled="true"
            >
              {t.noMatchingLocations}
            </li>
          ) : (
            suggestions.map((loc) => {
              const capacity = getMapPinCapacityInfo(t, loc.queueCount, loc.capacity)
              return (
                <li key={loc.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    data-testid={`map-search-result-${loc.id}`}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/70 focus:bg-muted/70 focus:outline-none"
                    onClick={() => handleSelect(loc)}
                  >
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: capacity.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {loc.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {loc.address}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
