import { Suspense } from "react"
import { LocationDetailPage } from "@/components/qflow/location-detail-page"

export function generateStaticParams() {
  return [{ id: "_" }]
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocationDetailPage />
    </Suspense>
  )
}
