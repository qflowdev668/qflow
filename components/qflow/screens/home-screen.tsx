"use client"

// PWA Install Prompt type
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useApp, Location } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { LocationCard } from "@/components/qflow/location-card"
import { JoinQueueDrawer } from "@/components/qflow/join-queue-drawer"
import { HomeGreetingSkeleton, HomeLocationSkeletons, HomeSearchSkeleton } from "@/components/qflow/home-content-skeleton"
import { QuickActionTile } from "@/components/qflow/user-screen-layout"
import {
  FindLocationScene,
  JoinRemotelyScene,
  WelcomeHomeScene,
} from "@/components/qflow/illustrations/queue-scenes"
import { Bell, Search, ServerCrash, RefreshCw, Smartphone, X, CheckCircle2, MapPin, Clock } from "lucide-react"
import { useServerOutage } from "@/components/qflow/server-outage-banner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useChromeInsets } from "@/hooks/use-chrome-insets"

const categoryIds = ["all", "clinic", "bank", "government", "other"] as const

export function HomeScreen() {
  const { currentUser, locations, locationsReady, navigateTo, notifications, setSelectedLocation, refreshLocations, activeQueue } = useApp()
  const t = useT()
  const { isServerDown } = useServerOutage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isRetrying, setIsRetrying] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [joinDrawerOpen, setJoinDrawerOpen] = useState(false)

  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstalledToast, setShowInstalledToast] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const toast = searchParams.get("toast")
    if (toast === "rate_denied") {
      setToastMessage(t.rateOnlyAfterServed)
      router.replace("/home", { scroll: false })
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, router, t.rateOnlyAfterServed])

  useEffect(() => {
    if (!currentUser) return
    const seenKey = "qflow_install_prompt_seen"
    if (localStorage.getItem(seenKey)) return
    setShowInstallBanner(true)
    localStorage.setItem(seenKey, "1")
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  }, [currentUser])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setShowInstalledToast(true)
        setTimeout(() => setShowInstalledToast(false), 3000)
      }
      setDeferredPrompt(null)
    }
    handleDismissInstallBanner()
  }

  const handleDismissInstallBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem("qflow_install_prompt_seen", "1")
  }

  const handleRetryConnection = async () => {
    setIsRetrying(true)
    try {
      await refreshLocations()
    } finally {
      setIsRetrying(false)
    }
  }

  const { paddingBottom } = useChromeInsets()
  const unreadCount = notifications.filter(n => !n.read).length

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t.greetingMorning
    if (hour < 18) return t.greetingAfternoon
    return t.greetingEvening
  }

  const categoryLabels: Record<(typeof categoryIds)[number], string> = {
    all: t.categoryAll,
    clinic: t.categoryClinic,
    bank: t.categoryBank,
    government: t.categoryGovernment,
    other: t.categoryOther,
  }

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || loc.type === selectedCategory
    return matchesSearch && matchesCategory
  })

  const sortedLocations = [...filteredLocations].sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1
    return a.waitTime - b.waitTime
  })

  const nearbyLocations = sortedLocations.slice(0, 4)

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location)
    setJoinDrawerOpen(true)
  }

  const openFirstClinic = () => {
    const clinic = sortedLocations.find((l) => l.type === "clinic" && l.isOpen)
    if (clinic) {
      handleLocationClick(clinic)
    } else {
      setSelectedCategory("clinic")
    }
  }

  return (
    <div className="min-h-dvh bg-white" style={{ paddingBottom }}>
      {/* Panel 1 — greeting + visual welcome */}
      <section className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {locationsReady ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">{getGreeting()}</p>
                <h1 className="text-2xl font-bold text-foreground tracking-tight mt-0.5">
                  {currentUser?.name.split(" ")[0]}
                </h1>
                <p className="text-base font-semibold text-foreground mt-2">
                  {t.findQueueToJoin}
                </p>
              </>
            ) : (
            <HomeGreetingSkeleton />
            )}
          </div>
          <button
            type="button"
            onClick={() => navigateTo("notifications")}
            className="relative p-3 rounded-2xl bg-muted shrink-0"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full" />
            )}
          </button>
        </div>

        <div className="mb-4 h-40 overflow-hidden rounded-3xl border border-border/80 sm:h-48 lg:h-56">
          <WelcomeHomeScene className="h-full w-full" />
        </div>

        {showInstallBanner && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 mb-4 relative">
            <button
              type="button"
              onClick={handleDismissInstallBanner}
              className="absolute top-2 right-2 p-1 hover:bg-primary/10 rounded-lg"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">{t.addToHomeScreen}</p>
                <p className="text-xs text-muted-foreground">{t.getNotifiedTurn}</p>
              </div>
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-sm font-bold shrink-0"
              >
                {t.install}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Panel 2 — search + quick actions (3 tiles) */}
      <section className="px-4 pb-4 border-b border-border/80">
        {locationsReady ? (
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.searchClinicsBanks}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-muted border-0 rounded-2xl text-base font-medium placeholder:text-muted-foreground"
            />
          </div>
        ) : (
          <HomeSearchSkeleton />
        )}

        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          <QuickActionTile
            illustration={<FindLocationScene className="w-full h-full scale-110" />}
            title={t.categoryClinic}
            subtitle={t.findLocationDesc.split(".")[0]}
            onClick={openFirstClinic}
          />
          <QuickActionTile
            illustration={<JoinRemotelyScene className="w-full h-full scale-110" />}
            title={t.navMyQueue}
            subtitle={activeQueue ? `#${String(activeQueue.position).padStart(3, "0")}` : t.noActiveQueueHint.split(".")[0]}
            onClick={() => navigateTo("my-queue")}
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
            onClick={() => navigateTo("map")}
            accent="success"
          />
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {categoryIds.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors",
                selectedCategory === cat
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </section>

      {/* Panel 3 — locations list */}
      {isServerDown && (
        <section className="px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <ServerCrash className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-destructive mb-2">{t.qflowUnavailable}</h3>
                <p className="text-sm text-foreground/80 mb-3">{t.serviceExperiencingIssues}</p>
                <Button
                  variant="outline"
                  onClick={handleRetryConnection}
                  disabled={isRetrying}
                  className="w-full h-11 rounded-xl"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} />
                  {isRetrying ? t.retrying : t.retryConnection}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 py-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t.shortestQueues}</h2>
        </div>
        <div className={cn("flex gap-3 overflow-x-auto pb-2 -mx-4 px-4", isServerDown && "opacity-60")}>
          {nearbyLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              variant="horizontal"
              onClick={() => !isServerDown && handleLocationClick(location)}
              disabled={isServerDown}
            />
          ))}
        </div>
      </section>

      <section className="px-4 pb-4">
        <h2 className="text-lg font-bold text-foreground mb-3">{t.allLocations}</h2>
        {locationsReady === false ? (
          <HomeLocationSkeletons />
        ) : (
        <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", isServerDown && "opacity-60")}>
          {sortedLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              variant="vertical"
              onClick={() => !isServerDown && handleLocationClick(location)}
              disabled={isServerDown}
            />
          ))}
        </div>
        )}

        {locationsReady !== false && sortedLocations.length === 0 && (
          <div className="text-center py-8">
            <FindLocationScene className="w-full max-w-xs mx-auto h-auto mb-4 rounded-2xl" />
            <p className="text-muted-foreground font-medium">
              {locations.length === 0 ? t.noLocationsAdded : t.noLocationsMatchSearch}
            </p>
          </div>
        )}
      </section>

      <BottomNav />

      <JoinQueueDrawer open={joinDrawerOpen} onOpenChange={setJoinDrawerOpen} />

      {showInstalledToast && (
        <div className="fixed bottom-28 left-4 right-4 bg-success text-white rounded-2xl p-4 shadow-lg z-50">
          <div className="flex items-center gap-2 justify-center">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold">{t.qflowInstalled}</p>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-28 left-4 right-4 bg-foreground text-background rounded-2xl p-4 shadow-lg z-50 text-center font-semibold">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
