import { Suspense } from "react"
import { JoinQueuePage } from "@/components/qflow/join-queue-page"

export function generateStaticParams() {
  return [{ id: "_" }]
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <JoinQueuePage />
    </Suspense>
  )
}
