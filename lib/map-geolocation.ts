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

/**
 * One-shot location fix. Tries high-accuracy first, then a coarser/network
 * fallback — Windows often fails GPS-only with enableHighAccuracy.
 */
export async function detectUserLocation(): Promise<GeoResult> {
  const precise = await readPosition({
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: 60_000,
  })
  if (precise.ok || precise.reason === "denied" || precise.reason === "unsupported") {
    return precise
  }

  return readPosition({
    enableHighAccuracy: false,
    timeout: 15_000,
    maximumAge: 120_000,
  })
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
