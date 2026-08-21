"use client"

// PWA Install Prompt type
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

import { useState, useEffect } from "react"
import { useApp, Location } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { LocationCard } from "@/components/qflow/location-card"
import { Bell, Search, ServerCrash, RefreshCw, Smartphone, X, CheckCircle2 } from "lucide-react"
import { useServerOutage } from "@/components/qflow/server-outage-banner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const categoryIds = ["all", "clinic", "bank", "government", "other"] as const

export function HomeScreen() {
  const { currentUser, locations, navigateTo, notifications, setSelectedLocation, refreshLocations } = useApp()
  const t = useT()
  const { isServerDown } = useServerOutage()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isRetrying, setIsRetrying] = useState(false)
  
  // PWA Install Banner — once after first login only
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstalledToast, setShowInstalledToast] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (!currentUser) return

    const seenKey = "qflow_install_prompt_seen"
    if (localStorage.getItem(seenKey)) return

    // First home visit after login — show once, then never again
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

  // Shortest queues first, closed locations last
  const sortedLocations = [...filteredLocations].sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1
    return a.waitTime - b.waitTime
  })

  const nearbyLocations = sortedLocations.slice(0, 4)

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location)
    navigateTo("location-detail")
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {getGreeting()}, {currentUser?.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground">{t.findQueueToJoin}</p>
          </div>
          <button 
            onClick={() => navigateTo("notifications")}
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Bell className="w-6 h-6 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* PWA Install Banner - Part A */}
        {showInstallBanner && (
          <div className="bg-[#2563EB] text-white rounded-2xl px-4 py-3 mb-3 relative">
            <button
              onClick={handleDismissInstallBanner}
              className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{t.addToHomeScreen}</p>
                <p className="text-xs text-blue-200">{t.getNotifiedTurn}</p>
              </div>
              <button
                onClick={handleInstallClick}
                className="bg-white text-[#2563EB] px-3 py-1 rounded-lg text-sm font-medium flex-shrink-0"
              >
                {t.install}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.searchClinicsBanks}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-muted border-0"
          />
        </div>
      </header>

      {/* Categories */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {categoryIds.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                selectedCategory === cat
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Server Outage Card - Part D */}
      {isServerDown && (
        <section className="px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <ServerCrash className="w-6 h-6 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-[#EF4444] mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                  {t.qflowUnavailable}
                </h3>
                <p className="text-sm text-gray-700 mb-1">
                  {t.serviceExperiencingIssues}
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  {t.whatToDo}
                </p>
                <ul className="text-sm text-gray-700 mb-4 space-y-1">
                  <li>• {t.visitInPerson}</li>
                  <li>• {t.askManualTicket}</li>
                  <li>• {t.checkBack30Min}</li>
                </ul>
                <Button
                  variant="outline"
                  onClick={handleRetryConnection}
                  disabled={isRetrying}
                  className="w-full h-11 border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} />
                  {isRetrying ? t.retrying : t.retryConnection}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Shortest queues right now */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t.shortestQueues}</h2>
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

      {/* All Locations (sorted with closed at bottom) */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t.allLocations}</h2>
        <div className={cn("space-y-3", isServerDown && "opacity-60")}>
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

        {sortedLocations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {locations.length === 0
                ? t.noLocationsAdded
                : t.noLocationsMatchSearch}
            </p>
          </div>
        )}
      </section>

      <BottomNav />

      {/* PWA Installed Toast - Part A */}
      {showInstalledToast && (
        <div className="fixed bottom-24 left-4 right-4 bg-[#10B981] text-white rounded-xl p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-2 justify-center">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">{t.qflowInstalled}</p>
          </div>
        </div>
      )}
    </div>
  )
}
