"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmt, useT } from "@/hooks/use-t"

export function AddLocationScreen() {
  const { addLocation, updateLocation, navigateTo, editingLocation, setEditingLocation } = useApp()
  const t = useT()
  const isEditing = !!editingLocation

  const locationTypes = [
    { id: "clinic" as const, label: t.typeClinic },
    { id: "bank" as const, label: t.typeBank },
    { id: "government" as const, label: t.typeGovernment },
    { id: "other" as const, label: t.typeOther },
  ]

  const [name, setName] = useState("")
  const [type, setType] = useState<"clinic" | "bank" | "government" | "other">("clinic")
  const [address, setAddress] = useState("")
  const [capacity, setCapacity] = useState("")
  const [description, setDescription] = useState("")
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")

  useEffect(() => {
    if (editingLocation) {
      setName(editingLocation.name)
      setType(editingLocation.type)
      setAddress(editingLocation.address)
      setCapacity(editingLocation.capacity.toString())
      setDescription(editingLocation.description || "")
      setLat(editingLocation.coordinates.lat.toString())
      setLng(editingLocation.coordinates.lng.toString())
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
      coordinates: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
      distance: "—",
      queueCount: editingLocation?.queueCount || 0,
      waitTime: editingLocation?.waitTime || 0,
      isOpen: editingLocation?.isOpen ?? true
    }

    if (isEditing && editingLocation) {
      updateLocation(editingLocation.id, locationData)
    } else {
      addLocation(locationData)
    }

    setEditingLocation(null)
    navigateTo("admin-dashboard")
  }

  const handleCancel = () => {
    setEditingLocation(null)
    navigateTo("admin-dashboard")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar 
        title={isEditing ? t.editLocation : t.addLocation} 
        showBack 
        backTo="admin-dashboard"
      />

      <form onSubmit={handleSubmit} className="flex-1 px-4 py-6 space-y-5 overflow-auto">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t.locationName}
          </label>
          <Input
            type="text"
            placeholder={t.locationNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t.locationType}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="w-full h-12 px-4 flex items-center justify-between bg-background border border-input rounded-lg text-left"
            >
              <span className="text-foreground">
                {locationTypes.find(locType => locType.id === type)?.label || t.selectType}
              </span>
              <ChevronDown className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showTypeDropdown && "rotate-180"
              )} />
            </button>
            
            {showTypeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10">
                {locationTypes.map((locType) => (
                  <button
                    key={locType.id}
                    type="button"
                    onClick={() => { 
                      setType(locType.id)
                      setShowTypeDropdown(false) 
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg",
                      type === locType.id && "bg-primary/10 text-primary"
                    )}
                  >
                    {locType.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t.addressLabel}
          </label>
          <Input
            type="text"
            placeholder={t.addressPlaceholder}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-12"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t.capacityField}
          </label>
          <Input
            type="number"
            placeholder={t.capacityPlaceholder}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="h-12"
            min="1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t.descriptionOptional}
          </label>
          <textarea
            placeholder={t.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[100px] px-4 py-3 bg-background border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t.coordinatesLabel}
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">{t.latitude}</label>
              <Input
                type="number"
                step="any"
                placeholder="-26.2041"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="h-12"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">{t.longitude}</label>
              <Input
                type="number"
                step="any"
                placeholder="28.0473"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="h-12"
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t.coordinatesHint}
          </p>
        </div>
      </form>

      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        <Button 
          type="submit"
          onClick={handleSubmit}
          className="w-full h-12 text-base font-semibold"
        >
          {isEditing ? t.saveChanges : t.saveLocation}
        </Button>
        <button 
          type="button"
          onClick={handleCancel}
          className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  )
}
