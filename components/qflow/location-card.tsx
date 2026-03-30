"use client"

import { MapPin, Users, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Location } from "@/lib/app-context"

interface LocationCardProps {
  location: Location
  variant?: "horizontal" | "vertical"
  onClick?: () => void
}

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

export function LocationCard({ location, variant = "vertical", onClick }: LocationCardProps) {
  if (variant === "horizontal") {
    return (
      <button
        onClick={onClick}
        className="flex-shrink-0 w-64 bg-card rounded-xl p-4 shadow-sm border border-border text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{location.name}</h3>
            <span className={cn("inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1", typeColors[location.type])}>
              {typeLabels[location.type]}
            </span>
          </div>
          <div className={cn(
            "w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 mt-1",
            location.isOpen ? "bg-success" : "bg-destructive"
          )} />
        </div>
        
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{location.queueCount} people waiting</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>~{location.waitTime} min</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{location.distance}</span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl p-4 shadow-sm border border-border text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{location.name}</h3>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", typeColors[location.type])}>
              {typeLabels[location.type]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{location.address}</p>
        </div>
        <div className="flex items-center gap-1.5 ml-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            location.isOpen ? "bg-success" : "bg-destructive"
          )} />
          <span className={cn(
            "text-xs font-medium",
            location.isOpen ? "text-success" : "text-destructive"
          )}>
            {location.isOpen ? "Open" : "Closed"}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>{location.queueCount} waiting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>~{location.waitTime} min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>{location.distance}</span>
        </div>
      </div>
    </button>
  )
}
