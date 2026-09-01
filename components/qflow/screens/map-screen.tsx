"use client"

import { useState } from "react"
import { useApp, Location } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { getMapPinCapacityInfo } from "@/lib/capacity-i18n"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { JoinQueueDrawer } from "@/components/qflow/join-queue-drawer"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const MAP_WIDTH = 400
const MAP_HEIGHT = 800
const MAP_PADDING = 60

function projectPins(locations: Location[]) {
  if (locations.length === 0) return new Map<string, { x: number; y: number }>()

  const lats = locations.map((l) => l.coordinates.lat)
  const lngs = locations.map((l) => l.coordinates.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const spanLat = maxLat - minLat || 1
  const spanLng = maxLng - minLng || 1

  return new Map(
    locations.map((loc) => [
      loc.id,
      {
        x:
          MAP_PADDING +
          ((loc.coordinates.lng - minLng) / spanLng) * (MAP_WIDTH - MAP_PADDING * 2),
        y:
          MAP_PADDING +
          ((maxLat - loc.coordinates.lat) / spanLat) * (MAP_HEIGHT - MAP_PADDING * 2),
      },
    ])
  )
}

export function MapScreen() {
  const { locations, setSelectedLocation: setContextLocation } = useApp()
  const t = useT()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [capacityFilter, setCapacityFilter] = useState<"all" | "available" | "busy" | "full">("all")
  const [joinDrawerOpen, setJoinDrawerOpen] = useState(false)

  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    const pct = loc.capacity > 0 ? (loc.queueCount / loc.capacity) * 100 : 0
    if (capacityFilter === "available") return pct < 76
    if (capacityFilter === "busy") return pct >= 76 && pct < 100
    if (capacityFilter === "full") return pct >= 100
    return true
  })

  const pins = projectPins(filteredLocations)

  const handlePinClick = (location: Location) => {
    setSelectedLocation(location)
    setContextLocation(location)
    setJoinDrawerOpen(true)
  }

  const cycleCapacityFilter = () => {
    setCapacityFilter((prev) => {
      if (prev === "all") return "available"
      if (prev === "available") return "busy"
      if (prev === "busy") return "full"
      return "all"
    })
  }

  const filterLabel =
    capacityFilter === "available"
      ? t.filterAvailable
      : capacityFilter === "busy"
        ? t.filterBusy
        : capacityFilter === "full"
          ? t.filterFull
          : t.filterAll

  return (
    <div className="fixed inset-0 bg-background">
      <div className="absolute inset-0 bg-[#e8f0e8]">
        <svg className="w-full h-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d1ddd1" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
          
          <path d="M 0 200 L 400 200" stroke="#fff" strokeWidth="8" />
          <path d="M 0 400 L 400 400" stroke="#fff" strokeWidth="8" />
          <path d="M 0 600 L 400 600" stroke="#fff" strokeWidth="8" />
          <path d="M 100 0 L 100 800" stroke="#fff" strokeWidth="6" />
          <path d="M 200 0 L 200 800" stroke="#fff" strokeWidth="10" />
          <path d="M 300 0 L 300 800" stroke="#fff" strokeWidth="6" />
          
          {filteredLocations.map((loc) => {
            const pos = pins.get(loc.id)
            if (!pos) return null
            const isSelected = selectedLocation?.id === loc.id
            const capacityInfo = getMapPinCapacityInfo(t, loc.queueCount, loc.capacity)
            
            return (
              <g 
                key={loc.id} 
                onClick={() => handlePinClick(loc)}
                className="cursor-pointer"
              >
                {capacityInfo.pulsing && (
                  <circle 
                    cx={pos.x} 
                    cy={pos.y} 
                    r={28} 
                    fill="none" 
                    stroke={capacityInfo.color}
                    strokeWidth="2" 
                    opacity="0.5"
                    className="animate-ping"
                  />
                )}
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r={isSelected ? 24 : 18} 
                  fill={isSelected ? "#2563EB" : capacityInfo.color} 
                  className="transition-all"
                />
                <circle cx={pos.x} cy={pos.y - 2} r={6} fill="#fff" />
                {isSelected && (
                  <circle 
                    cx={pos.x} 
                    cy={pos.y} 
                    r={32} 
                    fill="none" 
                    stroke="#2563EB" 
                    strokeWidth="2" 
                    opacity="0.5"
                    className="animate-ping"
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.searchLocations}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12 h-12 bg-card shadow-lg border-0"
          />
          <button
            type="button"
            onClick={cycleCapacityFilter}
            aria-label={filterLabel}
            title={filterLabel}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg",
              capacityFilter === "all" ? "bg-muted" : "bg-primary text-primary-foreground"
            )}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="absolute top-20 right-4 bg-card rounded-lg shadow-lg p-3 z-10">
        <p className="text-xs font-medium text-foreground mb-2">{t.capacity}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">{t.capacityLow}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">{t.capacityModerate}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-muted-foreground">{t.capacityHigh}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">{t.capacityFullLegend}</span>
          </div>
        </div>
      </div>

      <JoinQueueDrawer
        open={joinDrawerOpen}
        location={selectedLocation}
        onOpenChange={(open) => {
          setJoinDrawerOpen(open)
          if (!open) setSelectedLocation(null)
        }}
      />

      <BottomNav />
    </div>
  )
}
