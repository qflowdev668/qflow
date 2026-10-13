"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useApp, type Location } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { JoinQueueDrawer } from "@/components/qflow/join-queue-drawer"
import { QflowMap } from "@/components/qflow/qflow-map"
import { RouteSummaryCard } from "@/components/qflow/route-summary-card"
import {
  detectUserLocation,
  locationBannerMessage,
  subscribeBetterFix,
  LOW_ACCURACY_METERS,
  type GeoCoords,
  type GeoFailReason,
} from "@/lib/map-geolocation"
import {
  fetchMapboxRoute,
  type TravelProfile,
} from "@/lib/mapbox-directions"
import {
  clearActiveRoute,
  clearDirectionsPending,
  getActiveRoute,
  getDirectionsJob,
  setActiveRoute,
  setDirectionsError,
  setDirectionsPending,
  useActiveRoute,
  useDirectionsJob,
} from "@/lib/active-route-store"
import { ABOVE_BOTTOM_NAV, ABOVE_FLOW_BAR_PILL } from "@/lib/bottom-chrome"
import { MapLocationSearch } from "@/components/qflow/map-location-search"
import { Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function MapScreen() {
  const {
    locations,
    setSelectedLocation: setContextLocation,
    activeQueue,
  } = useApp()
  const t = useT()
  const activeRoute = useActiveRoute()
  const directionsJob = useDirectionsJob()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [capacityFilter, setCapacityFilter] = useState<"all" | "available" | "busy" | "full">("all")
  const [joinDrawerOpen, setJoinDrawerOpen] = useState(false)

  const [userLocation, setUserLocation] = useState<GeoCoords | null>(null)
  const [locationFailReason, setLocationFailReason] = useState<GeoFailReason | null>(null)
  const [showLocationBanner, setShowLocationBanner] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [centerOnUserToken, setCenterOnUserToken] = useState<number | null>(null)

  const [routeError, setRouteError] = useState<string | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [travelProfile, setTravelProfile] = useState<TravelProfile>(
    activeRoute?.route.profile ?? "walking"
  )

  const requestLocation = useCallback(async (recenter = false) => {
    setLocationLoading(true)
    const result = await detectUserLocation()
    setLocationLoading(false)
    if (result.ok) {
      setUserLocation(result.coords)
      setLocationFailReason(null)
      setShowLocationBanner(false)
      if (recenter) setCenterOnUserToken(Date.now())
      return
    }
    setUserLocation(null)
    setLocationFailReason(result.reason)
    setShowLocationBanner(true)
  }, [])

  useEffect(() => {
    void requestLocation(false)
  }, [requestLocation])

  useEffect(() => {
    if (activeRoute?.route.profile) {
      setTravelProfile(activeRoute.route.profile)
    }
  }, [activeRoute?.route.profile])

  const filteredLocations = useMemo(
    () =>
      locations.filter((loc) => {
        const matchesSearch =
          loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.address.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        const pct = loc.capacity > 0 ? (loc.queueCount / loc.capacity) * 100 : 0
        if (capacityFilter === "available") return pct < 76
        if (capacityFilter === "busy") return pct >= 76 && pct < 100
        if (capacityFilter === "full") return pct >= 100
        return true
      }),
    [locations, searchQuery, capacityFilter]
  )

  const mapLocations = useMemo(() => {
    if (!activeRoute) return filteredLocations
    const destination = locations.find((loc) => loc.id === activeRoute.locationId)
    if (!destination || filteredLocations.some((loc) => loc.id === destination.id)) {
      return filteredLocations
    }
    return [...filteredLocations, destination]
  }, [filteredLocations, locations, activeRoute])

  const handlePinClick = (location: Location) => {
    // Do not clear the active-queue route when browsing another pin.
    setSelectedLocation(location)
    setContextLocation(location)
    setJoinDrawerOpen(true)
    setSearchQuery("")
  }

  const loadDirections = useCallback(
    async (destination: Location, profile: TravelProfile = travelProfile) => {
      setRouteLoading(true)
      setRouteError(null)

      let origin = userLocation
      if (!origin) {
        const geo = await detectUserLocation()
        if (!geo.ok) {
          setRouteLoading(false)
          setRouteError(locationBannerMessage(geo.reason))
          setShowLocationBanner(true)
          setLocationFailReason(geo.reason)
          return
        }
        origin = geo.coords
        setUserLocation(geo.coords)
      }

      // Requesting directions to a different place replaces the previous route.
      if (activeRoute && activeRoute.locationId !== destination.id) {
        clearActiveRoute()
      }

      const result = await fetchMapboxRoute(
        origin,
        destination.coordinates,
        profile
      )
      setRouteLoading(false)
      if (!result.ok) {
        setRouteError(result.error)
        setDirectionsError(result.error)
        return
      }
      setTravelProfile(profile)
      clearDirectionsPending()
      setActiveRoute({
        queueEntryId:
          activeQueue && activeQueue.locationId === destination.id
            ? activeQueue.id
            : null,
        locationId: destination.id,
        locationCoords: destination.coordinates,
        route: result.route,
      })
    },
    [userLocation, travelProfile, activeRoute, activeQueue]
  )

  const loadDirectionsRef = useRef(loadDirections)
  const locationsRef = useRef(locations)
  loadDirectionsRef.current = loadDirections
  locationsRef.current = locations

  useEffect(() => {
    return subscribeBetterFix((coords) => {
      setUserLocation(coords)
      const route = getActiveRoute()
      const job = getDirectionsJob()
      const locationId = route?.locationId ?? job?.locationId
      if (!locationId) return
      const dest = locationsRef.current.find((loc) => loc.id === locationId)
      if (!dest) return
      void loadDirectionsRef.current(dest, route?.route.profile ?? "walking")
    })
  }, [])

  const directionsTarget = selectedLocation
  const directionsStarted = useRef<string | null>(null)

  const handleDirections = () => {
    if (!directionsTarget) return
    directionsStarted.current = null
    setDirectionsPending(directionsTarget.id)
    setJoinDrawerOpen(false)
  }

  // Home, the queue sheet, and the place page all set a pending job and land
  // here. This screen is what draws the line, so a tap never depends on a
  // second press to "wake up" the map.
  useEffect(() => {
    if (!directionsJob) {
      directionsStarted.current = null
      return
    }
    if (routeLoading) return
    if (activeRoute?.locationId === directionsJob.locationId) return
    const dest = locations.find((l) => l.id === directionsJob.locationId)
    if (!dest) return
    const attempt = `${dest.id}:${directionsJob.requestedAt}`
    if (directionsStarted.current === attempt) return
    directionsStarted.current = attempt
    setSelectedLocation(dest)
    setContextLocation(dest)
    setJoinDrawerOpen(false)
    void loadDirections(dest, "walking")
  }, [
    directionsJob,
    locations,
    activeRoute,
    routeLoading,
    loadDirections,
    setContextLocation,
  ])

  const cycleCapacityFilter = () => {
    setCapacityFilter((prev) => {
      if (prev === "all") return "available"
      if (prev === "available") return "busy"
      if (prev === "busy") return "full"
      return "all"
    })
  }

  const filterLabel =
    capacityFilter === "available"
      ? t.filterAvailable
      : capacityFilter === "busy"
        ? t.filterBusy
        : capacityFilter === "full"
          ? t.filterFull
          : t.filterAll

  const showRouteCard = Boolean(activeRoute || routeError || routeLoading)
  const pendingDestination = directionsJob
    ? locations.find((loc) => loc.id === directionsJob.locationId) ?? null
    : null
  const routeEnd =
    (activeRoute
      ? locations.find((loc) => loc.id === activeRoute.locationId)?.coordinates
      : null) ??
    activeRoute?.locationCoords ??
    pendingDestination?.coordinates ??
    null
  const overlayBottom = activeQueue ? ABOVE_FLOW_BAR_PILL : ABOVE_BOTTOM_NAV

  return (
    <div className="fixed inset-0 z-[1] h-dvh w-full overflow-hidden bg-[#EFF6FF]">
      <div className="absolute inset-0 z-0 h-full w-full">
        <QflowMap
          locations={mapLocations}
          selectedLocationId={selectedLocation?.id ?? activeRoute?.locationId ?? null}
          onSelectLocation={handlePinClick}
          t={t}
          focusToken={searchQuery.trim()}
          userLocation={userLocation}
          centerOnUserToken={centerOnUserToken}
          routeGeometry={activeRoute?.route.geometry ?? null}
          routeEnd={routeEnd}
          lockCamera={Boolean(activeRoute || directionsJob || routeLoading)}
          focusLocationId={null}
        />
      </div>

      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none md:right-auto md:w-full md:max-w-md">
        <div className="pointer-events-auto">
          <MapLocationSearch
            locations={locations}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onSelectLocation={handlePinClick}
            t={t}
            trailing={
              <button
                type="button"
                onClick={cycleCapacityFilter}
                aria-label={filterLabel}
                title={filterLabel}
                className={cn(
                  "absolute right-3 top-3 z-[1] rounded-lg p-1",
                  capacityFilter === "all" ? "bg-muted" : "bg-primary text-primary-foreground"
                )}
              >
                <Filter className="h-4 w-4" />
              </button>
            }
          />
        </div>
      </div>

      {showLocationBanner && locationFailReason && (
        <div
          className="absolute top-[4.5rem] left-4 right-20 z-10 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 shadow-sm"
          data-testid="location-denied-banner"
          role="status"
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs text-amber-900 leading-relaxed">
                {locationBannerMessage(locationFailReason)}
              </p>
              <button
                type="button"
                data-testid="location-try-again"
                disabled={locationLoading}
                className="rounded-lg bg-amber-900 px-2.5 py-1.5 text-xs font-medium text-amber-50 disabled:opacity-60"
                onClick={() => void requestLocation(true)}
              >
                {locationLoading ? "Checking…" : "Try again"}
              </button>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-1 text-amber-800 hover:bg-amber-100"
              onClick={() => setShowLocationBanner(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {userLocation?.accuracyMeters != null &&
        userLocation.accuracyMeters > LOW_ACCURACY_METERS && (
          <div
            className="absolute top-[4.5rem] left-4 right-20 z-10 rounded-lg bg-card/95 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm border border-border"
            data-testid="location-accuracy-hint"
          >
            Location accuracy ±{Math.round(userLocation.accuracyMeters / 1000)} km
          </div>
        )}

      <div className="absolute top-20 right-4 bg-card rounded-lg shadow-lg p-3 z-10">
        <p className="text-xs font-medium text-foreground mb-2">{t.capacity}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">{t.capacityLow}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">{t.capacityModerate}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-muted-foreground">{t.capacityHigh}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">{t.capacityFullLegend}</span>
          </div>
        </div>
      </div>

      {directionsJob && !activeRoute && !showRouteCard && (
        <div
          className="absolute left-4 right-4 z-20 rounded-xl bg-card px-3 py-2.5 text-sm shadow-lg border border-border"
          style={{ bottom: overlayBottom }}
          data-testid="directions-status"
          role="status"
        >
          {directionsJob.error ?? "Getting directions…"}
        </div>
      )}

      {showRouteCard && !activeQueue && (
        <div
          className="absolute left-4 right-4 z-20"
          style={{ bottom: overlayBottom }}
        >
          <RouteSummaryCard
            route={activeRoute?.route ?? null}
            destination={
              activeRoute?.locationCoords ??
              selectedLocation?.coordinates ?? { lat: 0, lng: 0 }
            }
            travelProfile={travelProfile}
            loading={routeLoading}
            error={routeError}
            onRetry={() => {
              const dest =
                selectedLocation ??
                locations.find((l) => l.id === activeRoute?.locationId) ??
                null
              if (dest) void loadDirections(dest, travelProfile)
            }}
            onProfileChange={(profile) => {
              const dest =
                selectedLocation ??
                locations.find((l) => l.id === activeRoute?.locationId) ??
                null
              if (dest) void loadDirections(dest, profile)
            }}
          />
        </div>
      )}

      <JoinQueueDrawer
        open={joinDrawerOpen}
        location={selectedLocation}
        showDirections={!activeRoute}
        directionsBusy={routeLoading}
        onDirections={handleDirections}
        onOpenChange={(open) => {
          setJoinDrawerOpen(open)
          if (!open) {
            setSelectedLocation(null)
            // Route stays drawn — cleared only when the queue entry ends.
          }
        }}
      />

      <BottomNav />
    </div>
  )
}
