"use client"

import { useState } from "react"
import { useApp, Location } from "@/lib/app-context"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { LocationCard } from "@/components/qflow/location-card"
import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const categories = [
  { id: "all", label: "All" },
  { id: "clinic", label: "Clinic" },
  { id: "bank", label: "Bank" },
  { id: "government", label: "Government" },
  { id: "other", label: "Other" }
]

export function HomeScreen() {
  const { currentUser, locations, navigateTo, notifications } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || loc.type === selectedCategory
    return matchesSearch && matchesCategory
  })

  const nearbyLocations = [...filteredLocations].sort((a, b) => 
    parseFloat(a.distance) - parseFloat(b.distance)
  ).slice(0, 4)

  const openLocations = filteredLocations.filter(loc => loc.isOpen)

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location)
    navigateTo("location-detail")
  }

  // Store selected location in context for detail screen
  if (selectedLocation) {
    (window as unknown as { selectedLocation: Location }).selectedLocation = selectedLocation
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {getGreeting()}, {currentUser?.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground">Find a queue to join</p>
          </div>
          <button 
            onClick={() => navigateTo("notifications")}
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Bell className="w-6 h-6 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search clinics, banks, offices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-muted border-0"
          />
        </div>
      </header>

      {/* Categories */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                selectedCategory === cat.id
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby Locations */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">Nearby Locations</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {nearbyLocations.map((location) => (
            <LocationCard 
              key={location.id} 
              location={location} 
              variant="horizontal"
              onClick={() => handleLocationClick(location)}
            />
          ))}
        </div>
      </section>

      {/* Currently Open */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">Currently Open</h2>
        <div className="space-y-3">
          {openLocations.map((location) => (
            <LocationCard 
              key={location.id} 
              location={location} 
              variant="vertical"
              onClick={() => handleLocationClick(location)}
            />
          ))}
        </div>

        {openLocations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No open locations found</p>
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  )
}
