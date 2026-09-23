/** Mapbox Directions API (walking / driving) for /map route preview. */

import type { GeoCoords } from "@/lib/map-geolocation"

export type TravelProfile = "walking" | "driving"

export type RouteSummary = {
  distanceMeters: number
  durationSeconds: number
  geometry: GeoJSON.LineString
  profile: TravelProfile
}

export type RouteFetchResult =
  | { ok: true; route: RouteSummary }
  | { ok: false; error: string }

type DirectionsResponse = {
  code?: string
  message?: string
  routes?: Array<{
    distance: number
    duration: number
    geometry?: { type: string; coordinates: number[][] }
  }>
}

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`
}

export function formatRouteDuration(seconds: number, profile: TravelProfile): string {
  const mins = Math.max(1, Math.round(seconds / 60))
  const unit = profile === "driving" ? "drive" : "walk"
  if (mins < 60) return `${mins} min ${unit}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min ${unit}` : `${h} h ${unit}`
}

export function googleMapsDirectionsUrl(
  destination: GeoCoords,
  profile: TravelProfile
): string {
  const mode = profile === "driving" ? "driving" : "walking"
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${destination.lat},${destination.lng}` +
    `&travelmode=${mode}`
  )
}

export async function fetchMapboxRoute(
  from: GeoCoords,
  to: GeoCoords,
  profile: TravelProfile = "walking",
  accessToken = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim()
): Promise<RouteFetchResult> {
  if (!accessToken) {
    return { ok: false, error: "Mapbox token is not configured." }
  }

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?geometries=geojson&overview=full&access_token=${encodeURIComponent(accessToken)}`

  try {
    const res = await fetch(url)
    const data = (await res.json().catch(() => ({}))) as DirectionsResponse
    if (!res.ok) {
      return {
        ok: false,
        error: data.message || `Directions request failed (${res.status}).`,
      }
    }
    const route = data.routes?.[0]
    if (!route?.geometry?.coordinates?.length) {
      return { ok: false, error: "No route found between these points." }
    }
    return {
      ok: true,
      route: {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        geometry: {
          type: "LineString",
          coordinates: route.geometry.coordinates,
        },
        profile,
      },
    }
  } catch {
    return { ok: false, error: "Couldn't calculate directions right now." }
  }
}
