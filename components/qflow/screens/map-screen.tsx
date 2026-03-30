"use client"

import { useState } from "react"
import { useApp, Location } from "@/lib/app-context"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { LocationCard } from "@/components/qflow/location-card"
import { Search, Filter, MapPin, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function MapScreen() {
  const { locations, navigateTo } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(true)

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePinClick = (location: Location) => {
    setSelectedLocation(location)
    setShowBottomSheet(true)
  }

  const handleJoinQueue = (location: Location) => {
    (window as unknown as { selectedLocation: Location }).selectedLocation = location
    navigateTo("location-detail")
  }

  return (
    <div className="fixed inset-0 bg-background">
      {/* Map Background */}
      <div className="absolute inset-0 bg-[#e8f0e8]">
        {/* Simplified map visualization */}
        <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          {/* Map grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d1ddd1" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
          
          {/* Roads */}
          <path d="M 0 200 L 400 200" stroke="#fff" strokeWidth="8" />
          <path d="M 0 400 L 400 400" stroke="#fff" strokeWidth="8" />
          <path d="M 0 600 L 400 600" stroke="#fff" strokeWidth="8" />
          <path d="M 100 0 L 100 800" stroke="#fff" strokeWidth="6" />
          <path d="M 200 0 L 200 800" stroke="#fff" strokeWidth="10" />
          <path d="M 300 0 L 300 800" stroke="#fff" strokeWidth="6" />
          
          {/* Location pins */}
          {filteredLocations.map((loc, index) => {
            const positions = [
              { x: 120, y: 150 },
              { x: 280, y: 220 },
              { x: 180, y: 350 },
              { x: 80, y: 450 },
              { x: 320, y: 480 },
              { x: 220, y: 580 }
            ]
            const pos = positions[index % positions.length]
            const isSelected = selectedLocation?.id === loc.id
            
            return (
              <g 
                key={loc.id} 
                onClick={() => handlePinClick(loc)}
                className="cursor-pointer"
              >
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r={isSelected ? 24 : 18} 
                  fill={isSelected ? "#2563EB" : "#3B82F6"} 
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

      {/* Search overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12 h-12 bg-card shadow-lg border-0"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-muted">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Bottom sheet */}
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
              
              <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                <span>{selectedLocation.queueCount} waiting</span>
                <span>~{selectedLocation.waitTime} min</span>
                <span>{selectedLocation.distance}</span>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => handleJoinQueue(selectedLocation)}
                  className="flex-1 h-12"
                >
                  Join Queue
                </Button>
                <Button variant="outline" className="h-12 px-4">
                  <MapPin className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-3 max-h-[40vh] overflow-auto">
              <h3 className="font-semibold text-foreground">Nearby Locations</h3>
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
