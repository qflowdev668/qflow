"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useApp } from "@/lib/app-context"
import { JoinQueueDrawer } from "@/components/qflow/join-queue-drawer"

/** Join URL opens the same bottom sheet (no separate confirmation page). */
export function JoinQueuePage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const {
    locations,
    selectedLocation,
    setSelectedLocation,
    navigateTo,
    isAuthenticated,
    isAuthLoading,
  } = useApp()
  const [open, setOpen] = useState(true)
  const id =
    searchParams.get("id")?.trim() ||
    (params?.id && params.id !== "_" ? params.id : null)

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !id) return
    if (selectedLocation?.id === id) return
    const match = locations.find((loc) => loc.id === id)
    if (match) setSelectedLocation(match)
  }, [
    id,
    locations,
    selectedLocation?.id,
    setSelectedLocation,
    isAuthenticated,
    isAuthLoading,
  ])

  if (isAuthLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-muted/30" aria-busy="true" />
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <JoinQueueDrawer
        open={open && Boolean(selectedLocation)}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) navigateTo("home")
        }}
      />
    </div>
  )
}
