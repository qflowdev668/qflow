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
  profile: TravelProfile,
  origin?: GeoCoords | null
): string {
  const mode = profile === "driving" ? "driving" : "walking"
  const from = origin ? `&origin=${origin.lat},${origin.lng}` : ""
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${destination.lat},${destination.lng}` +
    `${from}` +
    `&travelmode=${mode}`
  )
}

export function appleMapsDirectionsUrl(
  destination: GeoCoords,
  profile: TravelProfile,
  origin?: GeoCoords | null
): string {
  const dirflg = profile === "driving" ? "d" : "w"
  const from = origin ? `&saddr=${origin.lat},${origin.lng}` : ""
  return (
    `https://maps.apple.com/?daddr=${destination.lat},${destination.lng}` +
    `${from}&dirflg=${dirflg}`
  )
}

/** iPhone, iPad, and iPadOS (which reports as Macintosh with a touch screen). */
export function prefersAppleMaps(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

/**
 * Turn-by-turn URL for the device's maps app.
 * Apple Maps on Apple devices, Google Maps everywhere else.
 * Destination alone is enough — those apps find the user's GPS themselves.
 */
export function deviceMapsDirectionsUrl(
  destination: GeoCoords,
  profile: TravelProfile = "walking",
  options?: { origin?: GeoCoords | null; userAgent?: string; maxTouchPoints?: number }
): string {
  const ua = options?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")
  const touch =
    options?.maxTouchPoints ??
    (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0)
  const origin = options?.origin
  if (prefersAppleMaps(ua, touch)) {
    return appleMapsDirectionsUrl(destination, profile, origin)
  }
  return googleMapsDirectionsUrl(destination, profile, origin)
}

/** Open directions in the same click. Must stay synchronous so the browser allows the tab. */
export function openDeviceMaps(
  destination: GeoCoords,
  profile: TravelProfile = "walking",
  origin?: GeoCoords | null
): string {
  const url = deviceMapsDirectionsUrl(destination, profile, { origin })
  if (typeof window === "undefined") return url
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer")
    if (!opened) window.location.assign(url)
  } catch {
    /* popup blocked or a test environment without navigation */
  }
  return url
}

/**
 * Mapbox snaps the route end to the nearest road, which can leave the line
 * a block away from the place. Always finish on the exact destination.
 */
export function withExactDestination(
  coordinates: number[][],
  destination: GeoCoords
): number[][] {
  const exact: [number, number] = [destination.lng, destination.lat]
  const line = coordinates
    .filter((coord) => coord.length >= 2 && Number.isFinite(coord[0]) && Number.isFinite(coord[1]))
    .map((coord) => [coord[0], coord[1]] as [number, number])
  if (!line.length) return [exact]
  const last = line[line.length - 1]
  const drifted =
    Math.abs(last[0] - exact[0]) > 1e-5 || Math.abs(last[1] - exact[1]) > 1e-5
  if (drifted) line.push(exact)
  else line[line.length - 1] = exact
  return line
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
          coordinates: withExactDestination(route.geometry.coordinates, to),
        },
        profile,
      },
    }
  } catch {
    return { ok: false, error: "Couldn't calculate directions right now." }
  }
}
