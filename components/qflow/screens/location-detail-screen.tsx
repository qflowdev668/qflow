"use client"

import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { getCapacityInfo, getLocationTypeLabel } from "@/lib/capacity-i18n"
import { TopBar } from "@/components/qflow/top-bar"
import { useOfflineStatus } from "@/components/qflow/offline-banner"
import { Button } from "@/components/ui/button"
import { Users, Clock, Gauge, MapPin, Building2, Navigation, AlertTriangle, X, Ban, Bell, WifiOff, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { ServiceIcon } from "@/components/qflow/service-icon"
import { ACTIVE_STAFF, AVG_SERVICE_MINUTES } from "@/lib/supabase/helpers"
import { cn } from "@/lib/utils"
import { setDirectionsPending } from "@/lib/active-route-store"
import { useState } from "react"

// Get wait time color based on duration
function getWaitTimeColor(minutes: number) {
  if (minutes < 15) return "text-[#10B981]"
  if (minutes <= 30) return "text-[#F59E0B]"
  if (minutes <= 60) return "text-[#F97316]"
  return "text-[#EF4444]"
}

export function LocationDetailScreen() {
  const { navigateTo, activeQueue, leaveQueue, selectedLocation, setSelectedLocation } = useApp()
  const t = useT()
  const isOffline = useOfflineStatus()
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [showNotifyToast, setShowNotifyToast] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [showWaitBreakdown, setShowWaitBreakdown] = useState(false)

  const handleRetryConnection = () => {
    setIsRetrying(true)
    setTimeout(() => setIsRetrying(false), 2000)
  }

  const location = selectedLocation

  if (!location) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar title={t.locationTitle} showBack backTo="home" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-6">
            {t.noLocationSelectedHint}
          </p>
          <Button onClick={() => navigateTo("home")} className="px-8">
            {t.browseLocations}
          </Button>
        </div>
      </div>
    )
  }

  const capacityInfo = getCapacityInfo(t, location.queueCount, location.capacity)
  const isFull = capacityInfo.percentage >= 100
  const isHighCapacity = capacityInfo.level === "high" && !isFull
  const availableSpots = location.capacity - location.queueCount

  const isLocationClosed = !location.isOpen

  // Check if user is already in a queue (for a different location)
  const isAlreadyInQueue =
    activeQueue !== null && activeQueue.locationId !== location.id

  const canJoinQueue = !isFull && !isLocationClosed && !isAlreadyInQueue && !isOffline

  const calculatedWait = location?.waitTime ?? 0
  const bestCase = Math.round(calculatedWait * 0.75)
  const worstCase = Math.round(calculatedWait * 1.5)
  const waitTimeColor = getWaitTimeColor(calculatedWait)

  const handleJoinQueue = () => {
    navigateTo("join-queue-confirmation")
  }

  const handleGetDirections = () => {
    setSelectedLocation(location)
    setDirectionsPending(location.id)
    navigateTo("map")
  }

  const handleViewCurrentQueue = () => {
    navigateTo("my-queue")
  }

  const handleSwitchQueues = () => {
    leaveQueue()
    setShowSwitchDialog(false)
    navigateTo("join-queue-confirmation")
  }

  const handleNotifyMe = () => {
    try {
      const key = "qflow_space_alerts"
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[]
      const next = Array.from(new Set([...existing, location.id]))
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // ignore storage failures — toast still confirms the request
    }
    setShowNotifyToast(true)
    setTimeout(() => setShowNotifyToast(false), 3000)
  }

  const handleFindNearby = () => {
    navigateTo("map")
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        showBack 
        backTo="home"
        variant="transparent"
        className="absolute z-10 bg-gradient-to-b from-black/40 to-transparent"
      />

      {/* Hero Section */}
      <div className="h-64 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 right-5 w-20 h-20 rounded-full border-2 border-white" />
          <div className="absolute top-20 right-20 w-16 h-16 rounded-full bg-white/20" />
        </div>
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20">
            <ServiceIcon type={location.type} name={location.name} className="h-16 w-16" />
          </div>
        </div>

        {/* Category badge */}
        <div className="absolute bottom-4 left-4">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full capitalize">
            <Building2 className="w-4 h-4" />
            {getLocationTypeLabel(t, location.type)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-6 relative z-10">
        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-5 mb-4">
          {/* Title and Open/Closed Badge */}
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-2xl font-bold text-foreground">{location.name}</h1>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
              isLocationClosed
                ? "bg-[#EF4444]/10 text-[#EF4444]"
                : "bg-[#10B981]/10 text-[#10B981]"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                isLocationClosed ? "bg-[#EF4444]" : "bg-[#10B981]"
              )} />
              {isLocationClosed ? t.closedLabel : t.openLabel}
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center gap-2 text-muted-foreground mb-5">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{location.address}</p>
          </div>

          {/* Tappable Wait Time Stat - Part C */}
          <button
            onClick={() => setShowWaitBreakdown(!showWaitBreakdown)}
            className="w-full flex items-center justify-between bg-muted rounded-xl p-4 mb-4 hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className={cn("text-lg font-semibold", waitTimeColor)}>~{calculatedWait} {t.minUnit}</span>
            </div>
            {showWaitBreakdown ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {/* Wait Time Breakdown Card - Part C */}
          {showWaitBreakdown && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
              <h4 className="font-semibold text-foreground mb-3">{t.waitTimeBreakdown}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-blue-100">
                  <span className="text-sm text-muted-foreground">{t.peopleAheadOfYou}</span>
                  <span className="text-sm font-medium text-foreground">{location.queueCount}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-blue-100">
                  <span className="text-sm text-muted-foreground">{t.avgServiceTime}</span>
                  <span className="text-sm font-medium text-foreground">{AVG_SERVICE_MINUTES} {t.minUnit}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-blue-100">
                  <span className="text-sm text-muted-foreground">{t.countersAssumedOpen}</span>
                  <span className="text-sm font-medium text-foreground">{ACTIVE_STAFF}</span>
                </div>
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-blue-200">
                  <span className="text-sm font-semibold text-foreground">{t.calculatedWait}</span>
                  <span className={cn("text-sm font-bold", waitTimeColor)}>~{calculatedWait} {t.minUnit}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">{t.bestCase}</span>
                  <span className="text-sm font-medium text-[#10B981]">~{bestCase} {t.minUnit}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">{t.worstCase}</span>
                  <span className="text-sm font-medium text-[#F97316]">~{worstCase} {t.minUnit}</span>
                </div>
              </div>
            </div>
          )}

          {/* Stats Row - Capacity, In Queue, Available */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Gauge className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{location.capacity}</p>
              <p className="text-xs text-muted-foreground">{t.capacity}</p>
            </div>
            <div className="bg-primary/5 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{location.queueCount}</p>
              <p className="text-xs text-muted-foreground">{t.inQueueStat}</p>
            </div>
            <div className={cn(
              "rounded-xl p-4 text-center",
              isFull ? "bg-red-50" : availableSpots <= 5 ? "bg-amber-50" : "bg-green-50"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2",
                isFull ? "bg-red-100" : availableSpots <= 5 ? "bg-amber-100" : "bg-green-100"
              )}>
                <Clock className={cn(
                  "w-5 h-5",
                  isFull ? "text-red-600" : availableSpots <= 5 ? "text-amber-600" : "text-green-600"
                )} />
              </div>
              <p className={cn(
                "text-2xl font-bold",
                isFull ? "text-red-600" : availableSpots <= 5 ? "text-amber-600" : "text-green-600"
              )}>
                {availableSpots}
              </p>
              <p className="text-xs text-muted-foreground">{t.available}</p>
            </div>
          </div>
        </div>

        {/* Queue Capacity Indicator */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">{t.queueCapacity}</span>
            <span className={cn("text-sm font-medium", capacityInfo.textColor)}>
              {location.queueCount}/{location.capacity} ({Math.round(capacityInfo.percentage)}%)
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                capacityInfo.color,
                capacityInfo.pulsing && "animate-pulse"
              )}
              style={{ width: `${capacityInfo.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">0%</span>
            <span className={cn("text-xs font-medium", capacityInfo.textColor)}>{capacityInfo.label}</span>
            <span className="text-xs text-muted-foreground">100%</span>
          </div>
        </div>

        {/* High Capacity Warning - Part B */}
        {isHighCapacity && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  {t.queueFillingUpFast.replace("{spots}", String(availableSpots))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Queue Full Card - Part B */}
        {isFull && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-red-600 mb-2">{t.queueIsFull}</h3>
            <p className="text-sm text-red-700 mb-6 leading-relaxed">
              {t.reachedCapacity.replace("{name}", location.name).replace("{capacity}", String(location.capacity))}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleNotifyMe}
                className="w-full h-12 text-base font-semibold rounded-xl"
              >
                <Bell className="w-5 h-5 mr-2" />
                {t.notifyWhenSpaceOpens}
              </Button>
              <Button 
                variant="outline"
                onClick={handleFindNearby}
                className="w-full h-12 text-base rounded-xl"
              >
                {t.findNearbyLocations}
              </Button>
            </div>
          </div>
        )}

        {/* About */}
        {location.description && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <h3 className="font-semibold text-foreground mb-2">{t.about}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {location.description}
            </p>
          </div>
        )}

        {/* Already in Queue Warning Card */}
        {isAlreadyInQueue && activeQueue && !isFull && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 mb-2">{t.alreadyInQueueTitle}</h3>
                <p className="text-sm text-amber-700 leading-relaxed mb-4">
                  {t.currentlyWaitingAt}<br />
                  <span className="font-medium">{activeQueue.locationName}</span> — {t.positionNumber.replace("{position}", String(activeQueue.position))}<br />
                  {t.oneQueueAtATime}
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={handleViewCurrentQueue}
                    className="w-full h-12 text-base font-semibold rounded-xl"
                  >
                    {t.viewMyCurrentQueue}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowSwitchDialog(true)}
                    className="w-full h-12 text-base font-medium border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl"
                  >
                    {t.leaveCurrentJoinHere}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Location Closed Card */}
        {isLocationClosed && !isFull && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="w-8 h-8 text-[#EF4444]" />
            </div>
            <h3 className="text-lg font-bold text-[#EF4444] mb-2">{t.notAcceptingQueues}</h3>
            <p className="text-sm text-red-700 mb-6 leading-relaxed">
              {t.closedForNewEntries.replace("{name}", location.name)}
            </p>
            <Button 
              variant="outline"
              onClick={handleFindNearby}
              className="w-full h-12 text-base rounded-xl"
            >
              {t.findOpenLocations}
            </Button>
          </div>
        )}

        {/* Offline Join Prevention Card - Part D */}
        {isOffline && !isAlreadyInQueue && !isFull && !isLocationClosed && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t.noInternetConnection}</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {t.needInternetToJoin}
            </p>
            <Button 
              onClick={handleRetryConnection}
              disabled={isRetrying}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              <RefreshCw className={cn("w-5 h-5 mr-2", isRetrying && "animate-spin")} />
              {isRetrying ? t.retrying : t.retry}
            </Button>
          </div>
        )}

        {/* Action Buttons - Only show if can join queue */}
        {canJoinQueue && (
          <div className="space-y-3 pb-8">
            <Button 
              onClick={handleJoinQueue}
              className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg shadow-primary/25"
            >
              {t.joinQueue}
            </Button>
            <Button 
              variant="outline"
              onClick={handleGetDirections}
              className="w-full h-12 text-base rounded-xl"
            >
              <Navigation className="w-5 h-5 mr-2" />
              {t.getDirections}
            </Button>
          </div>
        )}

        {/* Get Directions only when cannot join queue */}
        {!canJoinQueue && (
          <div className="pb-8">
            <Button 
              variant="outline"
              onClick={handleGetDirections}
              className="w-full h-12 text-base rounded-xl"
            >
              <Navigation className="w-5 h-5 mr-2" />
              {t.getDirections}
            </Button>
          </div>
        )}
      </div>

      {showNotifyToast && (
        <div className="fixed bottom-6 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-foreground">
              {t.notifyWhenSpotOpens.replace("{name}", location.name)}
            </p>
          </div>
        </div>
      )}

      {showSwitchDialog && activeQueue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">{t.switchQueuesQuestion}</h3>
              <button 
                onClick={() => setShowSwitchDialog(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground mb-6">
              {t.leavingQueueWarning
                .replace("{name}", activeQueue.locationName)
                .replace("{position}", String(activeQueue.position))}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleSwitchQueues}
                className="w-full h-12 bg-destructive hover:bg-destructive/90"
              >
                {t.yesSwitchQueues}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowSwitchDialog(false)}
                className="w-full h-12"
              >
                {t.keepMySpot}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
