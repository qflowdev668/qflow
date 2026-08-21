"use client"

import { useState } from "react"
import { useApp, Location } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { getMapPinCapacityInfo } from "@/lib/capacity-i18n"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { LocationCard } from "@/components/qflow/location-card"
import { Search, Filter, MapPin, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  const { locations, navigateTo, setSelectedLocation: setContextLocation } = useApp()
  const t = useT()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(true)

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pins = projectPins(filteredLocations)

  const handlePinClick = (location: Location) => {
    setSelectedLocation(location)
    setShowBottomSheet(true)
  }

  const handleJoinQueue = (location: Location) => {
    setContextLocation(location)
    navigateTo("location-detail")
  }

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
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-muted">
            <Filter className="w-4 h-4 text-muted-foreground" />
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

      {showBottomSheet && (
        <div className="absolute bottom-20 left-0 right-0 bg-card rounded-t-3xl shadow-2xl border-t border-border max-h-[50vh] overflow-hidden">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-border rounded-full" />
          </div>
          
          {selectedLocation ? (
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{selectedLocation.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selectedLocation.address}</p>
                </div>
                <button 
                  onClick={() => setSelectedLocation(null)}
                  className="p-2 rounded-full hover:bg-muted"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              {(() => {
                const capacityInfo = getMapPinCapacityInfo(t, selectedLocation.queueCount, selectedLocation.capacity)
                const isFull = capacityInfo.percentage >= 100
                const percentage = Math.round(capacityInfo.percentage)
                
                return (
                  <>
                    <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                      <span>{selectedLocation.queueCount} {t.waiting}</span>
                      {isFull ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                          {t.queueFull}
                        </span>
                      ) : (
                        <span>~{selectedLocation.waitTime} {t.minUnit}</span>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">
                          {selectedLocation.queueCount} / {selectedLocation.capacity}
                        </span>
                        <span className={cn(
                          "font-medium",
                          isFull ? "text-red-600" :
                          percentage >= 76 ? "text-orange-600" :
                          percentage >= 51 ? "text-amber-600" : "text-green-600"
                        )}>
                          {capacityInfo.label}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            isFull ? "bg-red-500 animate-pulse" :
                            percentage >= 76 ? "bg-orange-500" :
                            percentage >= 51 ? "bg-amber-500" : "bg-green-500"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {isFull ? (
                      <div className="text-center py-2">
                        <p className="text-sm text-red-600 font-medium mb-1">{t.queueIsFull}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.spotsTaken
                            .replace("{taken}", String(selectedLocation.capacity))
                            .replace("{total}", String(selectedLocation.capacity))}
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => handleJoinQueue(selectedLocation)}
                          className="flex-1 h-12"
                        >
                          {t.joinQueue}
                        </Button>
                        <Button variant="outline" className="h-12 px-4">
                          <MapPin className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-3 max-h-[40vh] overflow-auto">
              <h3 className="font-semibold text-foreground">{t.locations}</h3>
              {filteredLocations.slice(0, 4).map((location) => (
                <LocationCard 
                  key={location.id} 
                  location={location}
                  onClick={() => handlePinClick(location)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
