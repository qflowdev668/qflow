"use client"

import { useState, type KeyboardEvent } from "react"
import { Users, Clock, Info } from "lucide-react"
import { useT } from "@/hooks/use-t"
import { getCapacityInfo, getLocationTypeLabel } from "@/lib/capacity-i18n"
import { ACTIVE_STAFF, AVG_SERVICE_MINUTES } from "@/lib/supabase/helpers"
import { cn } from "@/lib/utils"
import type { Location } from "@/lib/app-context"
import { ServiceIcon } from "@/components/qflow/service-icon"

interface LocationCardProps {
  location: Location
  variant?: "horizontal" | "vertical"
  onClick?: () => void
  disabled?: boolean
}

function getWaitTimeColor(minutes: number) {
  if (minutes < 15) return "text-success"
  if (minutes <= 30) return "text-secondary"
  if (minutes <= 60) return "text-accent"
  return "text-destructive"
}

const typeColors = {
  clinic: "bg-primary/10 text-primary",
  bank: "bg-secondary/10 text-secondary",
  government: "bg-success/10 text-success",
  other: "bg-muted text-foreground"
}

export function LocationCard({ location, variant = "vertical", onClick, disabled = false }: LocationCardProps) {
  const t = useT()
  const [showTooltip, setShowTooltip] = useState(false)
  const capacityInfo = getCapacityInfo(t, location.queueCount, location.capacity)
  const isFull = capacityInfo.percentage >= 100

  const calculatedWait = location.waitTime
  const waitTimeColor = getWaitTimeColor(calculatedWait)

  const isClosed = !location.isOpen
  const typeLabel = getLocationTypeLabel(t, location.type)

  const cardProps = disabled
    ? { "aria-disabled": true as const }
    : {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onClick?.()
          }
        },
      }

  if (variant === "horizontal") {
    return (
      <div
        {...cardProps}
        className={cn(
          "flex-shrink-0 w-64 bg-card rounded-2xl p-4 shadow-sm border border-border/70 text-left transition-shadow",
          (isFull || isClosed) && "opacity-60",
          disabled ? "cursor-not-allowed" : "cursor-pointer hover:shadow-md"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <ServiceIcon type={location.type} name={location.name} className="mr-2 h-10 w-10 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{location.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn("inline-block text-xs font-medium px-2 py-0.5 rounded-full", typeColors[location.type])}>
                {typeLabel}
              </span>
              {disabled && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {t.offline}
                </span>
              )}
            </div>
          </div>
          <div className={cn(
            "w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 mt-1",
            location.isOpen ? "bg-success" : "bg-destructive"
          )} />
        </div>

        <div className={cn(
          "flex items-center gap-1.5 text-xs font-medium mb-2",
          location.isOpen ? "text-success" : "text-destructive"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", location.isOpen ? "bg-[#10B981]" : "bg-[#EF4444]")} />
          {location.isOpen ? t.openLabel : t.closedLabel}
        </div>
        
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{location.queueCount} {t.peopleWaiting}</span>
          </div>
          {isFull ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-full">
                {t.queueFull}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 relative">
              <Clock className="w-4 h-4" />
              <span className={cn("font-medium", waitTimeColor)}>~{calculatedWait} {t.minUnit}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTooltip(!showTooltip)
                }}
                className="p-0.5 hover:bg-muted rounded-full"
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {showTooltip && (
                <div 
                  className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-3 z-50 w-52"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{t.basedOn}</p>
                  <div className="text-xs text-foreground space-y-1">
                    <p>{location.queueCount} {t.peopleAheadShort}</p>
                    <p>{t.avgMinService.replace("{minutes}", String(AVG_SERVICE_MINUTES))}</p>
                    <p>{t.counters.replace("{count}", String(ACTIVE_STAFF))}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{location.queueCount} / {location.capacity}</span>
            <span className={cn("font-medium", capacityInfo.textColor)}>
              {capacityInfo.label}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                capacityInfo.color,
                capacityInfo.pulsing && "animate-pulse"
              )}
              style={{ width: `${capacityInfo.percentage}%` }}
            />
          </div>
        </div>

      </div>
    )
  }

  return (
    <div
      {...cardProps}
      className={cn(
        "w-full bg-card rounded-2xl p-4 shadow-sm border border-border/70 text-left transition-shadow",
        (isFull || isClosed) && "opacity-60",
        disabled ? "cursor-not-allowed" : "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <ServiceIcon type={location.type} name={location.name} className="mr-3 h-12 w-12 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{location.name}</h3>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", typeColors[location.type])}>
              {typeLabel}
            </span>
            {disabled && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {t.offline}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{location.address}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 ml-3",
          location.isOpen ? "text-success" : "text-destructive"
        )}>
          <div className={cn("w-2 h-2 rounded-full", location.isOpen ? "bg-[#10B981]" : "bg-[#EF4444]")} />
          <span className="text-xs font-medium whitespace-nowrap">
            {location.isOpen ? t.openLabel : t.closedLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>{location.queueCount} {t.waiting}</span>
        </div>
        {isFull ? (
          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
            {t.queueFull}
          </span>
        ) : (
          <div className="flex items-center gap-1.5 relative">
            <Clock className="w-4 h-4" />
            <span className={cn("font-medium", waitTimeColor)}>~{calculatedWait} {t.minUnit}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTooltip(!showTooltip)
              }}
              className="p-0.5 hover:bg-muted rounded-full"
            >
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showTooltip && (
              <div 
                className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-3 z-50 w-52"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs text-muted-foreground mb-2 font-medium">{t.basedOn}</p>
                <div className="text-xs text-foreground space-y-1">
                  <p>{location.queueCount} {t.peopleAheadShort}</p>
                  <p>{t.avgMinService.replace("{minutes}", String(AVG_SERVICE_MINUTES))}</p>
                  <p>{t.counters.replace("{count}", String(ACTIVE_STAFF))}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">{location.queueCount} / {location.capacity}</span>
          <span className={cn("font-medium", capacityInfo.textColor)}>
            {capacityInfo.label}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              capacityInfo.color,
              capacityInfo.pulsing && "animate-pulse"
            )}
            style={{ width: `${capacityInfo.percentage}%` }}
          />
        </div>
      </div>

    </div>
  )
}
