"use client"

import { Suspense } from "react"
import { HomeScreen } from "@/components/qflow/screens/home-screen"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomeScreen />
    </Suspense>
  )
}
