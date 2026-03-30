"use client"

import { useState, useEffect } from "react"
import { useApp, Location } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const locationTypes = [
  { id: "clinic", label: "Clinic" },
  { id: "bank", label: "Bank" },
  { id: "government", label: "Government" },
  { id: "other", label: "Other" }
]

export function AddLocationScreen() {
  const { addLocation, updateLocation, navigateTo } = useApp()
  
  // Check if we're editing an existing location
  const editingLocation: Location | null = (window as unknown as { editingLocation: Location | null }).editingLocation || null
  const isEditing = !!editingLocation

  const [name, setName] = useState("")
  const [type, setType] = useState<"clinic" | "bank" | "government" | "other">("clinic")
  const [address, setAddress] = useState("")
  const [capacity, setCapacity] = useState("")
  const [description, setDescription] = useState("")
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [coordinates] = useState({ lat: -26.2041, lng: 28.0473 })

  useEffect(() => {
    if (editingLocation) {
      setName(editingLocation.name)
      setType(editingLocation.type)
      setAddress(editingLocation.address)
      setCapacity(editingLocation.capacity.toString())
      setDescription(editingLocation.description || "")
    }
  }, [editingLocation])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const locationData = {
      name,
      type,
      address,
      capacity: parseInt(capacity) || 50,
      description,
      coordinates,
      distance: "0 km",
      queueCount: editingLocation?.queueCount || 0,
      waitTime: editingLocation?.waitTime || 0,
      isOpen: editingLocation?.isOpen ?? true
    }

    if (isEditing && editingLocation) {
      updateLocation(editingLocation.id, locationData)
    } else {
      addLocation(locationData)
    }
    
    navigateTo("admin-dashboard")
  }

  const handleCancel = () => {
    navigateTo("admin-dashboard")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar 
        title={isEditing ? "Edit Location" : "Add Location"} 
        showBack 
        backTo="admin-dashboard"
      />

      <form onSubmit={handleSubmit} className="flex-1 px-4 py-6 space-y-5 overflow-auto">
        {/* Location Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Location Name
          </label>
          <Input
            type="text"
            placeholder="e.g., Hillbrow Clinic"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12"
            required
          />
        </div>

        {/* Location Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Location Type
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="w-full h-12 px-4 flex items-center justify-between bg-background border border-input rounded-lg text-left"
            >
              <span className="text-foreground">
                {locationTypes.find(t => t.id === type)?.label || "Select type"}
              </span>
              <ChevronDown className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showTypeDropdown && "rotate-180"
              )} />
            </button>
            
            {showTypeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10">
                {locationTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { 
                      setType(t.id as typeof type)
                      setShowTypeDropdown(false) 
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg",
                      type === t.id && "bg-primary/10 text-primary"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Address
          </label>
          <Input
            type="text"
            placeholder="Full street address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-12"
            required
          />
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Capacity
          </label>
          <Input
            type="number"
            placeholder="Maximum queue capacity"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="h-12"
            min="1"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description (Optional)
          </label>
          <textarea
            placeholder="Brief description of the location..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[100px] px-4 py-3 bg-background border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Map Preview */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Location Preview
          </label>
          <div className="h-40 bg-[#e8f0e8] rounded-xl flex items-center justify-center border border-border relative overflow-hidden">
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 400 160">
              <defs>
                <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#d1ddd1" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid2)"/>
              <path d="M 0 80 L 400 80" stroke="#fff" strokeWidth="4" />
              <path d="M 200 0 L 200 160" stroke="#fff" strokeWidth="4" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground">
              Tap to adjust pin location
            </p>
          </div>
        </div>
      </form>

      {/* Actions */}
      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        <Button 
          type="submit"
          onClick={handleSubmit}
          className="w-full h-12 text-base font-semibold"
        >
          {isEditing ? "Save Changes" : "Save Location"}
        </Button>
        <button 
          type="button"
          onClick={handleCancel}
          className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
