"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useApp } from "@/lib/app-context"
import { LocationDetailScreen } from "@/components/qflow/screens/location-detail-screen"

/** Loads the location from the URL into app context, then shows the detail screen. */
export function LocationDetailPage() {
  const params = useParams<{ id: string }>()
  const { locations, selectedLocation, setSelectedLocation } = useApp()
  const id = params?.id

  useEffect(() => {
    if (!id) return
    if (selectedLocation?.id === id) return
    const match = locations.find((loc) => loc.id === id)
    if (match) setSelectedLocation(match)
  }, [id, locations, selectedLocation?.id, setSelectedLocation])

  return <LocationDetailScreen />
}
