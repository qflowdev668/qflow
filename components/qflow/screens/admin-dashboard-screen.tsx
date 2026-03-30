"use client"

import { useApp } from "@/lib/app-context"
import { StatsCard } from "@/components/qflow/stats-card"
import { Button } from "@/components/ui/button"
import { 
  MapPin, 
  Users, 
  Activity, 
  UserCheck, 
  Plus, 
  LogOut,
  Edit2,
  Trash2,
  MoreVertical,
  FileText,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

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

export function AdminDashboardScreen() {
  const { currentUser, logout, locations, deleteLocation, navigateTo } = useApp()
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const stats = {
    totalLocations: locations.length,
    activeQueues: locations.filter(l => l.isOpen && l.queueCount > 0).length,
    usersToday: 234,
    staffOnline: 12
  }

  const handleAddLocation = () => {
    (window as unknown as { editingLocation: null }).editingLocation = null
    navigateTo("add-location")
  }

  const handleEditLocation = (locationId: string) => {
    const location = locations.find(l => l.id === locationId)
    if (location) {
      (window as unknown as { editingLocation: typeof location }).editingLocation = location
      navigateTo("add-location")
    }
    setOpenMenu(null)
  }

  const handleDeleteLocation = (locationId: string) => {
    deleteLocation(locationId)
    setOpenMenu(null)
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="bg-primary px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-white/80 text-sm">{currentUser?.name}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Quick Links */}
        <div className="flex gap-2">
          <button className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl p-3 text-white text-sm font-medium transition-colors">
            <MapPin className="w-5 h-5 mx-auto mb-1" />
            Locations
          </button>
          <button className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl p-3 text-white text-sm font-medium transition-colors">
            <FileText className="w-5 h-5 mx-auto mb-1" />
            Reports
          </button>
          <button className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl p-3 text-white text-sm font-medium transition-colors">
            <Settings className="w-5 h-5 mx-auto mb-1" />
            Settings
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatsCard 
            label="Total Locations" 
            value={stats.totalLocations}
            icon={MapPin}
            variant="primary"
          />
          <StatsCard 
            label="Active Queues" 
            value={stats.activeQueues}
            icon={Activity}
            variant="success"
          />
          <StatsCard 
            label="Users Today" 
            value={stats.usersToday}
            icon={Users}
            variant="warning"
          />
          <StatsCard 
            label="Staff Online" 
            value={stats.staffOnline}
            icon={UserCheck}
          />
        </div>

        {/* Locations List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Locations</h2>
            <Button size="sm" onClick={handleAddLocation}>
              <Plus className="w-4 h-4 mr-1" />
              Add New
            </Button>
          </div>

          <div className="space-y-3">
            {locations.map((location) => (
              <div 
                key={location.id}
                className="bg-card rounded-xl border border-border p-4 relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{location.name}</h3>
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                        typeColors[location.type]
                      )}>
                        {typeLabels[location.type]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{location.queueCount} in queue</span>
                      <span>Capacity: {location.capacity}</span>
                      <span className={location.isOpen ? "text-success" : "text-destructive"}>
                        {location.isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setOpenMenu(openMenu === location.id ? null : location.id)}
                      className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </button>

                    {openMenu === location.id && (
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 w-36 overflow-hidden">
                        <button
                          onClick={() => handleEditLocation(location.id)}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(location.id)}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={handleAddLocation}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}
