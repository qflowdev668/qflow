"use client"

import { Suspense } from "react"
import { HomeLoadingView } from "@/components/qflow/home-content-skeleton"
import { HomeScreen } from "@/components/qflow/screens/home-screen"

export default function Page() {
  return (
    <Suspense fallback={<HomeLoadingView />}>
      <HomeScreen />
    </Suspense>
  )
}
