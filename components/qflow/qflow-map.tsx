"use client"

/**
 * QFlow Mapbox canvas.
 *
 * MAP_STYLE is a single constant — swap to a custom Mapbox Studio style URL
 * when brand styling moves out of runtime setPaintProperty tweaks.
 * Fast-follow: design a Studio style (water/roads/labels) instead of paint overrides.
 */
import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Location } from "@/lib/app-context"
import { getMapPinCapacityInfo } from "@/lib/capacity-i18n"
import type { TranslationKeys } from "@/lib/i18n"
import type { GeoCoords } from "@/lib/map-geolocation"
import { LOW_ACCURACY_METERS, accuracyCirclePolygon } from "@/lib/map-geolocation"

/** Placeholder until a custom QFlow style exists in Mapbox Studio. */
export const MAP_STYLE = "mapbox://styles/mapbox/streets-v12"

export const DEFAULT_CENTER: [number, number] = [28.0473, -26.2041] // Johannesburg CBD [lng, lat]
const DEFAULT_ZOOM = 11

const ROUTE_SOURCE_ID = "qflow-route"
const ROUTE_LAYER_ID = "qflow-route-line"
const ACCURACY_SOURCE_ID = "qflow-accuracy"
const ACCURACY_LAYER_ID = "qflow-accuracy-fill"

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Soft QFlow blue tint + desaturated roads so capacity pins stay the focus. */
export function applyQflowBrandPaint(map: mapboxgl.Map) {
  const style = map.getStyle()
  if (!style?.layers) return

  for (const layer of style.layers) {
    const id = layer.id
    try {
      if (layer.type === "background") {
        map.setPaintProperty(id, "background-color", "#EFF6FF")
      }
      if (layer.type === "fill" && /water/i.test(id)) {
        map.setPaintProperty(id, "fill-color", "#BFDBFE")
      }
      if (layer.type === "line" && /water/i.test(id)) {
        map.setPaintProperty(id, "line-color", "#93C5FD")
      }
      if (
        layer.type === "line" &&
        /(road|bridge|tunnel|street|motorway|trunk|primary|secondary|tertiary)/i.test(id)
      ) {
        if (/motorway|trunk|primary/i.test(id)) {
          map.setPaintProperty(id, "line-color", "#94A3B8")
        } else {
          map.setPaintProperty(id, "line-color", "#CBD5E1")
        }
      }
    } catch {
      /* some street layers use data-driven paint we leave alone */
    }
  }
}

function createPinElement(opts: {
  color: string
  selected: boolean
  pulsing: boolean
  locationId: string
  name: string
}): HTMLElement {
  const size = opts.selected ? 48 : 36
  const el = document.createElement("button")
  el.type = "button"
  el.dataset.testid = `map-pin-${opts.locationId}`
  el.setAttribute("aria-label", opts.name)
  el.className = "qflow-map-pin"
  el.style.cssText = [
    "position:relative",
    "border:none",
    "padding:0",
    "background:transparent",
    "cursor:pointer",
    `width:${size}px`,
    `height:${size}px`,
    "display:flex",
    "align-items:center",
    "justify-content:center",
  ].join(";")

  if (opts.pulsing || opts.selected) {
    const ring = document.createElement("span")
    ring.className = "qflow-map-pin-ping"
    ring.style.cssText = [
      "position:absolute",
      "inset:0",
      "border-radius:9999px",
      `border:2px solid ${opts.selected ? "#2563EB" : opts.color}`,
      "opacity:0.45",
      "animation:qflow-map-ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
      "pointer-events:none",
    ].join(";")
    el.appendChild(ring)
  }

  const outer = document.createElement("span")
  outer.style.cssText = [
    `width:${opts.selected ? 40 : 32}px`,
    `height:${opts.selected ? 40 : 32}px`,
    "border-radius:9999px",
    `background:${opts.selected ? "#2563EB" : opts.color}`,
    "box-shadow:0 2px 8px rgba(15,23,42,0.25)",
    "display:flex",
    "align-items:flex-start",
    "justify-content:center",
    "padding-top:6px",
    "position:relative",
    "z-index:1",
  ].join(";")

  const dot = document.createElement("span")
  dot.style.cssText = [
    "width:12px",
    "height:12px",
    "border-radius:9999px",
    "background:#fff",
    "display:block",
  ].join(";")
  outer.appendChild(dot)
  el.appendChild(outer)
  return el
}

function createUserDotElement(): HTMLElement {
  const el = document.createElement("div")
  el.dataset.testid = "map-user-location"
  el.setAttribute("aria-label", "Your location")
  el.style.cssText = [
    "width:18px",
    "height:18px",
    "border-radius:9999px",
    "background:#2563EB",
    "border:3px solid #fff",
    "box-shadow:0 0 0 2px rgba(37,99,235,0.35), 0 2px 6px rgba(15,23,42,0.3)",
  ].join(";")
  return el
}

function ensurePingKeyframes() {
  if (typeof document === "undefined") return
  if (document.getElementById("qflow-map-ping-style")) return
  const style = document.createElement("style")
  style.id = "qflow-map-ping-style"
  style.textContent = `
    @keyframes qflow-map-ping {
      75%, 100% { transform: scale(1.75); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .qflow-map-pin-ping { animation: none !important; }
    }
  `
  document.head.appendChild(style)
}

function clearAccuracyLayers(map: mapboxgl.Map) {
  if (map.getLayer(ACCURACY_LAYER_ID)) map.removeLayer(ACCURACY_LAYER_ID)
  if (map.getSource(ACCURACY_SOURCE_ID)) map.removeSource(ACCURACY_SOURCE_ID)
}

function setAccuracyCircle(map: mapboxgl.Map, userLocation: GeoCoords | null) {
  clearAccuracyLayers(map)
  const accuracy = userLocation?.accuracyMeters
  if (
    !userLocation ||
    typeof accuracy !== "number" ||
    !Number.isFinite(accuracy) ||
    accuracy <= LOW_ACCURACY_METERS
  ) {
    return
  }

  map.addSource(ACCURACY_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: accuracyCirclePolygon(userLocation, accuracy),
    },
  })
  map.addLayer({
    id: ACCURACY_LAYER_ID,
    type: "fill",
    source: ACCURACY_SOURCE_ID,
    paint: {
      "fill-color": "#2563EB",
      "fill-opacity": 0.12,
    },
  })
}

function clearRouteLayers(map: mapboxgl.Map) {
  if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID)
  if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID)
}

function setRouteOnMap(map: mapboxgl.Map, geometry: GeoJSON.LineString | null) {
  clearRouteLayers(map)
  if (!geometry?.coordinates?.length) return

  map.addSource(ROUTE_SOURCE_ID, {
    type: "geojson",
    data: { type: "Feature", properties: {}, geometry },
  })
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#2563EB",
      "line-width": 5,
      "line-opacity": 0.9,
    },
  })
}

export type QflowMapProps = {
  locations: Location[]
  selectedLocationId: string | null
  onSelectLocation: (location: Location) => void
  t: TranslationKeys
  /** When the filtered set shrinks to one place (e.g. search), center on it. */
  focusToken?: string
  /** Live browser geolocation (blue “you are here” dot). */
  userLocation?: GeoCoords | null
  /** When true, fly/jump once to the user location (first fix). */
  centerOnUserToken?: string | number | null
  /** GeoJSON line from Mapbox Directions — replaces any previous route. */
  routeGeometry?: GeoJSON.LineString | null
  /** When true, pin updates do not auto-fit the camera (route view owns it). */
  lockCamera?: boolean
}

export function QflowMap({
  locations,
  selectedLocationId,
  onSelectLocation,
  t,
  focusToken,
  userLocation = null,
  centerOnUserToken = null,
  routeGeometry = null,
  lockCamera = false,
}: QflowMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const lastUserCenterToken = useRef<string | number | null>(null)
  const onSelectRef = useRef(onSelectLocation)
  onSelectRef.current = onSelectLocation

  const token = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim()

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return

    ensurePingKeyframes()
    mapboxgl.accessToken = token

    const container = containerRef.current
    const map = new mapboxgl.Map({
      container,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: true,
      cooperativeGestures: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right")

    const resize = () => {
      try {
        map.resize()
      } catch {
        /* map may already be removed */
      }
    }

    map.on("load", () => {
      applyQflowBrandPaint(map)
      resize()
    })

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    ro?.observe(container)
    window.addEventListener("resize", resize)
    requestAnimationFrame(resize)

    mapRef.current = map

    return () => {
      window.removeEventListener("resize", resize)
      ro?.disconnect()
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [token])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !token) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const withCoords = locations.filter(
      (loc) =>
        Number.isFinite(loc.coordinates?.lat) && Number.isFinite(loc.coordinates?.lng)
    )

    for (const loc of withCoords) {
      const capacityInfo = getMapPinCapacityInfo(t, loc.queueCount, loc.capacity)
      const el = createPinElement({
        color: capacityInfo.color,
        selected: selectedLocationId === loc.id,
        pulsing: capacityInfo.pulsing,
        locationId: loc.id,
        name: loc.name,
      })
      el.addEventListener("click", (e) => {
        e.stopPropagation()
        onSelectRef.current(loc)
      })

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([loc.coordinates.lng, loc.coordinates.lat])
        .addTo(map)
      markersRef.current.push(marker)
    }

    if (lockCamera || withCoords.length === 0) return

    const reduceMotion = prefersReducedMotion()
    if (withCoords.length === 1) {
      const loc = withCoords[0]
      const center: [number, number] = [loc.coordinates.lng, loc.coordinates.lat]
      if (reduceMotion) {
        map.jumpTo({ center, zoom: Math.max(map.getZoom(), 13) })
      } else {
        map.flyTo({ center, zoom: Math.max(map.getZoom(), 13), essential: true })
      }
      return
    }

    const bounds = new mapboxgl.LngLatBounds()
    for (const loc of withCoords) {
      bounds.extend([loc.coordinates.lng, loc.coordinates.lat])
    }
    map.fitBounds(bounds, {
      padding: { top: 96, bottom: 120, left: 48, right: 48 },
      maxZoom: 14,
      duration: reduceMotion ? 0 : 800,
      essential: true,
    })
  }, [locations, selectedLocationId, t, token, focusToken, lockCamera])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !token) return

    if (!userLocation) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      clearAccuracyLayers(map)
      return
    }

    // Marker uses [lng, lat] — same order as Mapbox Directions coordinates.
    const lngLat: [number, number] = [userLocation.lng, userLocation.lat]
    if (!userMarkerRef.current) {
      userMarkerRef.current = new mapboxgl.Marker({
        element: createUserDotElement(),
        anchor: "center",
      })
        .setLngLat(lngLat)
        .addTo(map)
    } else {
      userMarkerRef.current.setLngLat(lngLat)
    }

    const applyAccuracy = () => setAccuracyCircle(map, userLocation)
    if (map.isStyleLoaded()) applyAccuracy()
    else map.once("load", applyAccuracy)

    if (
      centerOnUserToken != null &&
      centerOnUserToken !== lastUserCenterToken.current &&
      !lockCamera
    ) {
      lastUserCenterToken.current = centerOnUserToken
      const reduceMotion = prefersReducedMotion()
      if (reduceMotion) {
        map.jumpTo({ center: lngLat, zoom: Math.max(map.getZoom(), 13) })
      } else {
        map.flyTo({ center: lngLat, zoom: Math.max(map.getZoom(), 13), essential: true })
      }
    }
  }, [userLocation, centerOnUserToken, token, lockCamera])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !token) return

    const apply = () => {
      setRouteOnMap(map, routeGeometry ?? null)
      if (!routeGeometry?.coordinates?.length) return

      const bounds = new mapboxgl.LngLatBounds()
      for (const coord of routeGeometry.coordinates) {
        bounds.extend(coord as [number, number])
      }
      map.fitBounds(bounds, {
        padding: { top: 100, bottom: 220, left: 48, right: 48 },
        maxZoom: 15,
        duration: prefersReducedMotion() ? 0 : 700,
        essential: true,
      })
    }

    if (map.isStyleLoaded()) {
      apply()
    } else {
      map.once("load", apply)
    }
  }, [routeGeometry, token])

  if (!token) {
    return (
      <div
        className="absolute inset-0 flex h-full w-full min-h-0 items-center justify-center bg-[#EFF6FF] px-6"
        data-testid="map-token-missing"
        role="status"
      >
        <p className="max-w-sm text-center text-sm text-slate-600 leading-relaxed">
          Map is unavailable. Set <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> in
          the environment, then rebuild the app.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="qflow-map-canvas absolute inset-0 h-full w-full min-h-0 [&_.mapboxgl-ctrl-bottom-right]:mb-36 [&_.mapboxgl-ctrl-bottom-right]:mr-3"
      data-testid="qflow-map-canvas"
      aria-label="Location map"
    />
  )
}
