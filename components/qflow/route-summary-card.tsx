"use client"

import { Button } from "@/components/ui/button"
import {
  formatRouteDistance,
  formatRouteDuration,
  type RouteSummary,
  type TravelProfile,
} from "@/lib/mapbox-directions"
import type { GeoCoords } from "@/lib/map-geolocation"
import { cn } from "@/lib/utils"

type RouteSummaryCardProps = {
  route?: RouteSummary | null
  destination: GeoCoords
  travelProfile: TravelProfile
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onProfileChange?: (profile: TravelProfile) => void
  /** Tighter card for stacking above the Flow Bar pill. */
  compact?: boolean
  className?: string
}

/** Distance, walk or drive time, and retry — the route stays on the QFlow map. */
export function RouteSummaryCard({
  route = null,
  travelProfile,
  loading = false,
  error = null,
  onRetry,
  onProfileChange,
  compact = false,
  className,
}: RouteSummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-lg",
        compact ? "p-2.5" : "p-3",
        className
      )}
      data-testid="route-summary-card"
      data-compact={compact ? "true" : undefined}
    >
      {loading && (
        <p className="text-sm text-muted-foreground">Calculating directions…</p>
      )}
      {error && !loading && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </div>
      )}
      {route && !loading && !error && (
        <div className={cn("space-y-2", compact && "space-y-1.5")}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-sm")}>
                {formatRouteDistance(route.distanceMeters)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {formatRouteDuration(route.durationSeconds, route.profile)}
              </p>
            </div>
            {onProfileChange && (
              <div className="flex shrink-0 rounded-lg border border-border p-0.5 text-xs">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-1",
                    travelProfile === "walking"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onProfileChange("walking")
                  }}
                >
                  Walk
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-1",
                    travelProfile === "driving"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onProfileChange("driving")
                  }}
                >
                  Drive
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
