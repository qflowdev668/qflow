/** Browser geolocation helpers for /map (single fix, no watchPosition). */

export type GeoCoords = {
  lat: number
  lng: number
  /** meters — from GeolocationCoordinates.accuracy */
  accuracyMeters?: number
}

export type GeoFailReason =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout"
  | "error"

export type GeoResult =
  | { ok: true; coords: GeoCoords }
  | { ok: false; reason: GeoFailReason }

/** Accuracy worse than this is treated as low-confidence on the map. */
export const LOW_ACCURACY_METERS = 5000

function readPosition(options: PositionOptions): Promise<GeoResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: "unsupported" })
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Geolocation API: latitude / longitude (never swap).
        // Mapbox Directions URL expects lng,lat — see mapbox-directions.ts.
        const coords: GeoCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        }
        if (typeof console !== "undefined") {
          console.info("[qflow:geo]", {
            lat: coords.lat,
            lng: coords.lng,
            accuracyMeters: coords.accuracyMeters,
            lowConfidence:
              typeof coords.accuracyMeters === "number" &&
              coords.accuracyMeters > LOW_ACCURACY_METERS,
          })
        }
        resolve({ ok: true, coords })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ ok: false, reason: "denied" })
        } else if (err.code === err.TIMEOUT) {
          resolve({ ok: false, reason: "timeout" })
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          resolve({ ok: false, reason: "unavailable" })
        } else {
          resolve({ ok: false, reason: "error" })
        }
      },
      options
    )
  })
}

const CACHE_MS = 120_000
/** A fix this tight is good enough to keep. Rougher fixes are replaced automatically. */
const GOOD_ACCURACY_METERS = 100
/** Ignore GPS jitter so a better fix does not redraw the route for a few metres. */
const REFINE_MOVE_METERS = 75

let cachedFix: { coords: GeoCoords; at: number } | null = null
let inflightFix: Promise<GeoResult> | null = null
const betterFixListeners = new Set<(coords: GeoCoords) => void>()

/** Test helper — drop the in-memory fix so cases don't share a position. */
export function __resetGeoCacheForTests() {
  cachedFix = null
  inflightFix = null
  betterFixListeners.clear()
}

function distanceMeters(a: GeoCoords, b: GeoCoords) {
  const earth = 6_371_000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)))
}

function isGoodFix(coords: GeoCoords) {
  return (
    typeof coords.accuracyMeters === "number" &&
    coords.accuracyMeters <= GOOD_ACCURACY_METERS
  )
}

function publish(coords: GeoCoords) {
  const prev = cachedFix?.coords ?? null
  cachedFix = { coords, at: Date.now() }
  if (!prev) return
  const moved = distanceMeters(prev, coords)
  const accuracyImproved =
    (prev.accuracyMeters ?? Number.POSITIVE_INFINITY) -
      (coords.accuracyMeters ?? Number.POSITIVE_INFINITY) >
    50
  if (moved >= REFINE_MOVE_METERS || (accuracyImproved && moved >= 25)) {
    betterFixListeners.forEach((listener) => listener(coords))
  }
}

/**
 * Fires when a later GPS fix is accurate enough to replace the first route.
 * One tap can draw immediately, then correct itself without a second tap.
 */
export function subscribeBetterFix(listener: (coords: GeoCoords) => void) {
  betterFixListeners.add(listener)
  return () => {
    betterFixListeners.delete(listener)
  }
}

/**
 * One-shot location fix for directions.
 * Uses a recent fix or the browser's cached/network position first so a tap
 * is not stuck behind a 10s+ GPS timeout. A precise watch updates the cache
 * in the background and never blocks the caller.
 */
export async function detectUserLocation(): Promise<GeoResult> {
  if (
    cachedFix &&
    isGoodFix(cachedFix.coords) &&
    Date.now() - cachedFix.at < CACHE_MS
  ) {
    return { ok: true, coords: cachedFix.coords }
  }
  if (inflightFix) return inflightFix

  inflightFix = locateFast().finally(() => {
    inflightFix = null
  })
  return inflightFix
}

function refineInBackground() {
  void readPosition({
    enableHighAccuracy: true,
    timeout: 8_000,
    maximumAge: 0,
  }).then((precise) => {
    if (precise.ok) publish(precise.coords)
  })
}

async function locateFast(): Promise<GeoResult> {
  const quick = await readPosition({
    enableHighAccuracy: false,
    timeout: 4_000,
    maximumAge: 300_000,
  })
  if (quick.ok) {
    publish(quick.coords)
    if (!isGoodFix(quick.coords)) refineInBackground()
    return quick
  }
  if (quick.reason === "denied" || quick.reason === "unsupported") return quick

  const precise = await readPosition({
    enableHighAccuracy: true,
    timeout: 8_000,
    maximumAge: 60_000,
  })
  if (precise.ok) publish(precise.coords)
  return precise
}

export function locationBannerMessage(reason: GeoFailReason): string {
  switch (reason) {
    case "denied":
      return "Location is blocked. Use the lock icon in the address bar → Site settings → Location → Allow, then tap Try again."
    case "unavailable":
      return "Couldn't find your position. Turn on Location in Windows Settings, then tap Try again."
    case "timeout":
      return "Location timed out. Move near a window or tap Try again."
    case "unsupported":
      return "This browser does not support location."
    default:
      return "Enable location to see distances and directions."
  }
}

/** Rough circle polygon for Mapbox (lng/lat rings). */
export function accuracyCirclePolygon(
  center: GeoCoords,
  radiusMeters: number,
  points = 64
): GeoJSON.Polygon {
  const coords: [number, number][] = []
  const earth = 6_371_000
  const latRad = (center.lat * Math.PI) / 180
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * 2 * Math.PI
    const dx = radiusMeters * Math.cos(angle)
    const dy = radiusMeters * Math.sin(angle)
    const dLat = (dy / earth) * (180 / Math.PI)
    const dLng = (dx / (earth * Math.cos(latRad))) * (180 / Math.PI)
    coords.push([center.lng + dLng, center.lat + dLat])
  }
  return { type: "Polygon", coordinates: [coords] }
}
