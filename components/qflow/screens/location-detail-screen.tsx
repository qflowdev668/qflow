"use client"

import { useApp, Location } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Users, Clock, Gauge, MapPin, Building2, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

export function LocationDetailScreen() {
  const { navigateTo } = useApp()
  
  // Hillbrow Clinic data as specified
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
    description: "Public health clinic offering general healthcare services including consultations, vaccinations, and chronic medication collection."
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
        className="absolute z-10 bg-gradient-to-b from-black/40 to-transparent"
      />

      {/* Hero Section */}
      <div className="h-64 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 right-5 w-20 h-20 rounded-full border-2 border-white" />
          <div className="absolute top-20 right-20 w-16 h-16 rounded-full bg-white/20" />
        </div>
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20">
            <Building2 className="w-14 h-14 text-white" />
          </div>
        </div>

        {/* Category badge */}
        <div className="absolute bottom-4 left-4">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full">
            <Building2 className="w-4 h-4" />
            Clinic
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-6 relative z-10">
        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-5 mb-4">
          {/* Title and Open Badge */}
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-2xl font-bold text-foreground">{location.name}</h1>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
              location.isOpen 
                ? "bg-success/10 text-success" 
                : "bg-destructive/10 text-destructive"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                location.isOpen ? "bg-success" : "bg-destructive"
              )} />
              {location.isOpen ? "Open" : "Closed"}
            </div>
          </div>
          
          {/* Address */}
          <div className="flex items-center gap-2 text-muted-foreground mb-5">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{location.address}</p>
          </div>

          {/* Stats Row - 12 waiting, ~25 min wait, capacity 50 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary/5 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{location.queueCount}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
            <div className="bg-secondary/5 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
              <p className="text-2xl font-bold text-foreground">~{location.waitTime}</p>
              <p className="text-xs text-muted-foreground">Min Wait</p>
            </div>
            <div className="bg-muted rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Gauge className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{location.capacity}</p>
              <p className="text-xs text-muted-foreground">Capacity</p>
            </div>
          </div>
        </div>

        {/* Queue Capacity Indicator */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Queue Capacity</span>
            <span className="text-sm text-muted-foreground">
              {location.queueCount}/{location.capacity}
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(location.queueCount / location.capacity) * 100}%` }}
            />
          </div>
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
            className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg shadow-primary/25"
            disabled={!location.isOpen}
          >
            Join Queue
          </Button>
          <Button 
            variant="outline"
            onClick={handleGetDirections}
            className="w-full h-12 text-base rounded-xl"
          >
            <Navigation className="w-5 h-5 mr-2" />
            Get Directions
          </Button>
        </div>
      </div>
    </div>
  )
}
