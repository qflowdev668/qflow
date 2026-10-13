"use client"

import type { ReactNode } from "react"
import { AppProvider, useApp } from "@/lib/app-context"
import { OfflineBanner } from "@/components/qflow/offline-banner"
import {
  SessionProvider,
  SessionWarningBanner,
  SessionExpiredScreen,
  useSession,
} from "@/components/qflow/session-expiry-banner"
import { HighContrastProvider } from "@/components/qflow/high-contrast-provider"
import {
  ServerOutageProvider,
  ServerOutageBanner,
} from "@/components/qflow/server-outage-banner"
import { Suspense } from "react"
import { RoutePersistence } from "@/components/qflow/route-persistence"
import { PwaRegister } from "@/components/qflow/pwa-register"
import { FlowBar } from "@/components/qflow/flow-bar"
import { ActiveRouteSync } from "@/components/qflow/active-route-sync"

function SessionGate({ children }: { children: ReactNode }) {
  const { isExpired } = useSession()
  const { logout } = useApp()

  if (isExpired) {
    return (
      <SessionExpiredScreen
        onLogin={() => {
          void logout()
        }}
        onRejoin={() => {
          void logout()
        }}
      />
    )
  }

  return (
    <>
      <OfflineBanner />
      <SessionWarningBanner />
      {children}
    </>
  )
}

/** Shared client shell: providers + chrome around App Router pages. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <SessionProvider>
        <ServerOutageProvider>
          <HighContrastProvider>
            <div className="relative mx-auto min-h-dvh w-full max-w-qflow bg-background">
              <ServerOutageBanner />
              <Suspense fallback={null}>
                <RoutePersistence />
              </Suspense>
              <PwaRegister />
              <SessionGate>
                <ActiveRouteSync />
                {children}
                <FlowBar />
              </SessionGate>
            </div>
          </HighContrastProvider>
        </ServerOutageProvider>
      </SessionProvider>
    </AppProvider>
  )
}
