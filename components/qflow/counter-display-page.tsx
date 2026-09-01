"use client"

import { useParams, useSearchParams } from "next/navigation"
import { CounterDisplayScreen } from "@/components/qflow/screens/counter-display-screen"

export function CounterDisplayPage() {
  const params = useParams<{ locationId: string }>()
  const searchParams = useSearchParams()
  const locationId =
    searchParams.get("id")?.trim() ||
    (params?.locationId && params.locationId !== "_" ? params.locationId : "")

  return <CounterDisplayScreen locationId={locationId} />
}
