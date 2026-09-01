import { Suspense } from "react"
import { CounterDisplayPage } from "@/components/qflow/counter-display-page"

export function generateStaticParams() {
  return [{ locationId: "_" }]
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CounterDisplayPage />
    </Suspense>
  )
}
