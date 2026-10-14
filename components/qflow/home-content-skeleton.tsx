"use client"

import { Bell, Clock, MapPin } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FindLocationScene,
  JoinRemotelyScene,
  WelcomeHomeScene,
} from "@/components/qflow/illustrations/queue-scenes"
import { QuickActionTile } from "@/components/qflow/user-screen-layout"
import { useT } from "@/hooks/use-t"
import { cn } from "@/lib/utils"

const categoryIds = ["all", "clinic", "bank", "government", "other"] as const

export function HomeGreetingSkeleton() {
  return (
    <div data-testid="home-greeting-skeleton" className="space-y-2" aria-busy="true">
      <div className="h-4 w-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-5 w-52 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
    </div>
  )
}

export function HomeSearchSkeleton() {
  return (
    <div
      data-testid="home-search-skeleton"
      className="mb-4 h-14 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
      aria-busy="true"
    />
  )
}

export function HomeLocationSkeletons() {
  return (
    <div className="space-y-3" data-testid="home-location-skeletons" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-2xl border border-border/80 bg-white p-4">
          <Skeleton className="mb-3 h-5 w-2/3 motion-reduce:animate-none" />
          <Skeleton className="mb-2 h-4 w-1/2 motion-reduce:animate-none" />
          <Skeleton className="h-4 w-1/3 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  )
}

/**
 * Home while locations are still loading. The sign-in cover renders this
 * same tree when the destination is Home.
 */
export function HomeLoadingView() {
  const t = useT()
  const categoryLabels: Record<(typeof categoryIds)[number], string> = {
    all: t.categoryAll,
    clinic: t.categoryClinic,
    bank: t.categoryBank,
    government: t.categoryGovernment,
    other: t.categoryOther,
  }

  return (
    <div className="min-h-dvh bg-white">
      <section className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <HomeGreetingSkeleton />
          </div>
          <button type="button" tabIndex={-1} className="relative p-3 rounded-2xl bg-muted shrink-0">
            <Bell className="w-5 h-5 text-foreground" />
          </button>
        </div>
        <div className="mb-4 h-40 overflow-hidden rounded-3xl border border-border/80 sm:h-48 lg:h-56">
          <WelcomeHomeScene className="h-full w-full" />
        </div>
      </section>

      <section className="px-4 pb-4 border-b border-border/80">
        <HomeSearchSkeleton />
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          <QuickActionTile
            illustration={<FindLocationScene className="w-full h-full scale-110" />}
            title={t.categoryClinic}
            subtitle={t.findLocationDesc.split(".")[0]}
            onClick={() => undefined}
          />
          <QuickActionTile
            illustration={<JoinRemotelyScene className="w-full h-full scale-110" />}
            title={t.navMyQueue}
            subtitle={t.noActiveQueueHint.split(".")[0]}
            onClick={() => undefined}
            accent="secondary"
          />
          <QuickActionTile
            illustration={
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
            }
            title={t.navMap}
            subtitle={t.allLocations}
            onClick={() => undefined}
            accent="success"
          />
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {categoryIds.map((cat) => (
            <button
              key={cat}
              type="button"
              tabIndex={-1}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors",
                cat === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              )}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 py-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t.shortestQueues}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" />
      </section>

      <section className="px-4 pb-4">
        <h2 className="text-lg font-bold text-foreground mb-3">{t.allLocations}</h2>
        <HomeLocationSkeletons />
      </section>
    </div>
  )
}

export function NeutralSignInSkeleton() {
  return (
    <div className="min-h-dvh bg-white px-4 pt-6" data-testid="post-sign-in-neutral">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="mt-6 h-14 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      <div className="mt-4 h-32 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
    </div>
  )
}
