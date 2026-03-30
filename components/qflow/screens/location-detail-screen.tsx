"use client"

import { useApp, Location } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { StatsCard } from "@/components/qflow/stats-card"
import { Button } from "@/components/ui/button"
import { Users, Clock, MapPin, Building2, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

const typeColors = {
  clinic: "bg-blue-100 text-blue-700",
  bank: "bg-amber-100 text-amber-700",
  government: "bg-emerald-100 text-emerald-700",
  other: "bg-gray-100 text-gray-700"
}

const typeLabels = {
  clinic: "Clinic",
  bank: "Bank",
  government: "Government",
  other: "Other"
}

export function LocationDetailScreen() {
  const { navigateTo } = useApp()
  
  // Get selected location from window (set by home screen)
  const location: Location = (window as unknown as { selectedLocation: Location }).selectedLocation || {
    id: "1",
    name: "Hillbrow Clinic",
    type: "clinic",
    address: "123 Pretoria St, Hillbrow, Johannesburg",
    distance: "1.2 km",
    queueCount: 12,
    waitTime: 25,
    capacity: 50,
    isOpen: true,
    coordinates: { lat: -26.1868, lng: 28.0459 },
    description: "Public health clinic offering general healthcare services."
  }

  const handleJoinQueue = () => {
    navigateTo("join-queue-confirmation")
  }

  const handleGetDirections = () => {
    window.open(`https://maps.google.com/?q=${location.coordinates.lat},${location.coordinates.lng}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        showBack 
        backTo="home"
        variant="transparent"
        className="absolute z-10 bg-gradient-to-b from-black/20 to-transparent"
      />

      {/* Hero Image */}
      <div className="h-56 bg-gradient-to-br from-primary/80 to-primary flex items-end justify-center pb-8 relative">
        <Building2 className="w-24 h-24 text-white/30" />
        <div className="absolute bottom-4 left-4 right-4">
          <span className={cn(
            "inline-block text-xs font-medium px-3 py-1 rounded-full",
            typeColors[location.type]
          )}>
            {typeLabels[location.type]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-4 relative z-10">
        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-4 mb-4">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-xl font-bold text-foreground">{location.name}</h1>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-2.5 h-2.5 rounded-full animate-pulse",
                location.isOpen ? "bg-success" : "bg-destructive"
              )} />
              <span className={cn(
                "text-sm font-medium",
                location.isOpen ? "text-success" : "text-destructive"
              )}>
                {location.isOpen ? "Open Now" : "Closed"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{location.address}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <StatsCard 
              label="Queue" 
              value={location.queueCount}
              icon={Users}
              variant="primary"
            />
            <StatsCard 
              label="Est. Wait" 
              value={`${location.waitTime}m`}
              icon={Clock}
              variant="warning"
            />
            <StatsCard 
              label="Capacity" 
              value={location.capacity}
            />
            <StatsCard 
              label="Distance" 
              value={location.distance}
              icon={Navigation}
            />
          </div>
        </div>

        {/* Queue Status */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
            <span className="font-medium text-foreground">Live Queue Status</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current wait time</span>
            <span className="font-semibold text-foreground">~{location.waitTime} minutes</span>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min((location.queueCount / location.capacity) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {location.queueCount} of {location.capacity} capacity
          </p>
        </div>

        {/* About */}
        {location.description && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <h3 className="font-semibold text-foreground mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {location.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pb-8">
          <Button 
            onClick={handleJoinQueue}
            className="w-full h-14 text-base font-semibold"
            disabled={!location.isOpen}
          >
            {location.isOpen ? "Join Queue" : "Location Closed"}
          </Button>
          <Button 
            variant="outline"
            onClick={handleGetDirections}
            className="w-full h-12 text-base"
          >
            <Navigation className="w-5 h-5 mr-2" />
            Get Directions
          </Button>
        </div>
      </div>
    </div>
  )
}
