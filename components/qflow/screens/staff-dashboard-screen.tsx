"use client"

import { useState } from "react"
import { useApp, type PriorityType, type StaffQueueItem } from "@/lib/app-context"
import { StatsCard } from "@/components/qflow/stats-card"
import { AddWalkInModal } from "@/components/qflow/add-walk-in-modal"
import { useOfflineStatus } from "@/components/qflow/offline-banner"
import { Button } from "@/components/ui/button"
import { Users, Clock, CheckCircle2, Phone, LogOut, UserPlus, Star, Zap, Shield, Info, AlertTriangle, WifiOff, RefreshCw, Timer, Power, ClipboardList, ChevronLeft, ChevronRight, Printer, X } from "lucide-react"
import { useServerOutage } from "@/components/qflow/server-outage-banner"
import { cn } from "@/lib/utils"
import { fmt, useT } from "@/hooks/use-t"

const priorityRank = (item: StaffQueueItem) =>
  item.priorityType === "emergency" ? 0 : item.priorityType === "fast-track" ? 1 : 2

export function StaffDashboardScreen() {
  const {
    currentUser,
    logout,
    callNext,
    serveWalkIn,
    addWalkIn,
    isOnBreak,
    toggleBreak,
    locationQueue,
    staffLocationName,
    shiftSummary,
    locations,
    lastSyncedAt,
    refreshLocations,
    refreshStaffQueue,
  } = useApp()
  const t = useT()
  const isOffline = useOfflineStatus()
  const { isServerDown } = useServerOutage()
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false)
  
  // Manual ticket mode state - Part B
  const [manualTicketNumber, setManualTicketNumber] = useState(1)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [manualLog, setManualLog] = useState<
    { number: number; time: string; status: "served" | "current" }[]
  >([])
  const [isRetrying, setIsRetrying] = useState(false)
  
  // Break management state - Part A
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [breakDuration, setBreakDuration] = useState(15) // default 15 min
  const [customBreakDuration, setCustomBreakDuration] = useState("")
  const [breakMessage, setBreakMessage] = useState("")
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0)
  const [showBreakEndOverlay, setShowBreakEndOverlay] = useState(false)
  
  // Shift handover state - Part A/B/C
  const [showEndShiftModal, setShowEndShiftModal] = useState(false)
  const [handoverNotes, setHandoverNotes] = useState("")
  const [showShiftEndedToast, setShowShiftEndedToast] = useState(false)

  const everyoneWaiting = locationQueue
  const priorityQueue = everyoneWaiting
    .filter((item) => item.priorityType !== "standard")
    .sort((a, b) => priorityRank(a) - priorityRank(b) || a.position - b.position)
  const standardQueue = everyoneWaiting.filter((item) => item.priorityType === "standard")

  const staffLocation = locations.find((loc) => loc.id === currentUser?.locationId)
  const isHighLoad =
    !!staffLocation && staffLocation.queueCount / staffLocation.capacity >= 0.8

  // System status - Part C
  const systemSyncStatus = (isOffline ? "offline" : "live") as "live" | "syncing" | "offline"

  const handleEndShift = () => {
    setShowEndShiftModal(false)
    setShowShiftEndedToast(true)
    setTimeout(() => {
      logout()
    }, 2000)
  }

  const handleExportManualLog = () => {
    const header = "ticket,status,time\n"
    const rows = manualLog
      .map((entry) => `${String(entry.number).padStart(3, "0")},${entry.status},${entry.time}`)
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `qflow-manual-log-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }
  
  // Calculate break end time
  const getBreakEndTime = (minutes: number) => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + minutes)
    return now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }
  
  const breakMessageOptions = [
    t.breakMessageStaffShort,
    fmt(t.breakMessageBackAt, { time: getBreakEndTime(breakDuration === 0 ? parseInt(customBreakDuration) || 15 : breakDuration) }),
    t.breakMessageWaitSoon,
  ]

  // Handle starting break
  const handleStartBreak = () => {
    const duration = breakDuration === 0 ? parseInt(customBreakDuration) || 15 : breakDuration
    setBreakTimeRemaining(duration * 60) // convert to seconds
    toggleBreak()
    setShowBreakModal(false)
    
    // Start countdown
    const interval = setInterval(() => {
      setBreakTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setShowBreakEndOverlay(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Handle extending break
  const handleExtendBreak = () => {
    setBreakTimeRemaining(prev => prev + 10 * 60) // add 10 minutes
    setShowBreakEndOverlay(false)
  }

  // Handle resuming from break
  const handleResumeFromBreak = () => {
    setBreakTimeRemaining(0)
    setShowBreakEndOverlay(false)
    toggleBreak()
  }

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleRetryConnection = async () => {
    setIsRetrying(true)
    try {
      await Promise.all([refreshLocations(), refreshStaffQueue()])
    } finally {
      setIsRetrying(false)
    }
  }

  // Manual ticket handlers - Part B
  const handlePreviousTicket = () => {
    setManualTicketNumber(prev => Math.max(1, prev - 1))
  }

  const handleNextTicket = () => {
    const newNumber = manualTicketNumber + 1
    setManualTicketNumber(newNumber)
    setManualLog(prev => [
      ...prev.slice(-2).map(item => ({ ...item, status: "served" as const })),
      { number: newNumber, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), status: "current" as const }
    ])
  }

  const handlePrintTicket = () => {
    window.print()
  }

  const totalWaiting = priorityQueue.length + standardQueue.length

  const stats = {
    waiting: totalWaiting,
    avgWait: shiftSummary.avgServiceTime,
    servedToday: shiftSummary.customersServed,
    priorityNow: priorityQueue.length,
  }

  const handleAddWalkIn = async (customer: {
    name: string
    priorityType: PriorityType
    priorityCategory?: string
    notes?: string
  }) => {
    return addWalkIn({
      name: customer.name,
      waitDuration: 0,
      isWalkIn: true,
      hasSpecialNeeds: Boolean(customer.notes) || customer.priorityType !== "standard",
      priorityType: customer.priorityType,
      priorityCategory: customer.priorityCategory,
      notes: customer.notes,
    })
  }

  const handleServe = (item: StaffQueueItem) => {
    serveWalkIn(item)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Changes to amber when on break (Part B) */}
      <header className={cn(
        "px-4 pt-6 pb-8 transition-colors",
        isOnBreak ? "bg-[#F59E0B]" : "bg-primary"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {isOnBreak ? t.staffDashboardOnBreak : t.staffDashboard}
            </h1>
            <p className="text-white/80 text-sm">{staffLocationName ?? t.noLocationAssigned}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* System Status Indicator - Part C */}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-2 h-2 rounded-full",
                systemSyncStatus === "live" && "bg-[#10B981]",
                systemSyncStatus === "syncing" && "bg-[#F59E0B] animate-spin",
                systemSyncStatus === "offline" && "bg-[#EF4444]"
              )} />
              <span className="text-xs text-white/80">
                {systemSyncStatus === "live" && t.statusLive}
                {systemSyncStatus === "syncing" && t.statusSyncing}
                {systemSyncStatus === "offline" && t.statusOffline}
              </span>
            </div>
            {/* End Shift Button - Part A */}
            <button 
              onClick={() => setShowEndShiftModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/50 rounded-lg text-sm text-white hover:bg-white/10 transition-colors"
            >
              <Power className="w-4 h-4" />
              {t.endShift}
            </button>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isOnBreak ? "bg-amber-400" : "bg-emerald-400"
          )} />
          <span className="text-white flex-1">
            {isOnBreak ? t.onBreak : t.active}
          </span>
          <button
            onClick={() => isOnBreak ? handleResumeFromBreak() : setShowBreakModal(true)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isOnBreak 
                ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                : "bg-amber-500 text-white hover:bg-amber-600"
            )}
          >
            {isOnBreak ? t.resume : t.takeBreak}
          </button>
        </div>
      </header>

      {/* High Load Banner - Part C */}
      {isHighLoad && !isOnBreak && (
        <div className="mx-2 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            <p className="text-xs text-amber-800">
              {t.highTrafficBanner}
            </p>
          </div>
        </div>
      )}

      {/* Break Timer Card - Part B */}
      {isOnBreak && breakTimeRemaining > 0 && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-amber-700 mb-2">{t.breakEndsIn}</p>
          <p className="text-5xl font-bold text-amber-800 mb-4">
            {formatTimeRemaining(breakTimeRemaining)}
          </p>
          <div className="space-y-3">
            <Button 
              onClick={handleResumeFromBreak}
              className="w-full h-12 bg-[#2563EB] hover:bg-[#2563EB]/90"
            >
              {t.imBackResumeService}
            </Button>
            <Button 
              variant="outline"
              onClick={handleExtendBreak}
              className="w-full h-12 border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
            >
              {t.extendBreakTenMin}
            </Button>
          </div>
        </div>
      )}

      {/* Offline Banner - Part C */}
      {isOffline && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">{t.connectionLost}</p>
              <p className="text-sm text-red-700 mt-1">
                {t.queueUpdatesPaused}
                {lastSyncedAt && (
                  <>
                    <br />
                    {t.lastSync} {lastSyncedAt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                  </>
                )}
              </p>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleRetryConnection}
                disabled={isRetrying}
                className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} />
                {isRetrying ? t.retrying : t.retryConnection}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Ticket Mode Panel - Part B */}
      {isServerDown && (
        <div className="mx-4 mt-4 bg-white border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-red-800" />
            <h3 className="font-semibold text-red-800">{t.manualTicketMode}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">{t.qflowOfflineManualMode}</p>

          <div className="text-center mb-4">
            <p className="text-sm text-gray-500 mb-1">{t.currentlyServingLabel}</p>
            <p className="text-[72px] font-bold text-[#2563EB] leading-none">
              {String(manualTicketNumber).padStart(3, "0")}
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handlePreviousTicket}
              className="flex-1 h-11 border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t.previousBtn}
            </Button>
            <div className="flex-1 h-11 flex items-center justify-center bg-gray-100 rounded-md font-bold text-gray-700">
              {String(manualTicketNumber).padStart(3, "0")}
            </div>
            <Button
              variant="outline"
              onClick={handleNextTicket}
              className="flex-1 h-11 border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
            >
              {t.next}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Print Ticket Button */}
          <Button
            onClick={() => setShowPrintModal(true)}
            className="w-full h-[52px] bg-[#2563EB] hover:bg-[#2563EB]/90 mb-4"
          >
            <Printer className="w-5 h-5 mr-2" />
            {t.printTicketForCustomer}
          </Button>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">{t.manualLog}</p>
            <div className="space-y-2">
              {manualLog.map((entry) => (
                <div 
                  key={entry.number}
                  className="bg-gray-50 rounded-lg px-3 py-2 text-sm flex items-center justify-between"
                >
                  <span className="font-medium">#{String(entry.number).padStart(3, "0")}</span>
                  <span className="text-gray-600">
                    {entry.status === "current" ? t.currentlyServingStatus : fmt(t.servedAtTime, { time: entry.time })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <Button
            variant="outline"
            className="w-full h-11 border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
            onClick={handleExportManualLog}
          >
            {t.exportManualLogWhenOnline}
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-4 gap-2 mb-6">
          <StatsCard 
            label={t.statWaiting} 
            value={stats.waiting}
            icon={Users}
            variant="primary"
          />
          <StatsCard 
            label={t.statAvgWait} 
            value={stats.avgWait === null ? "—" : `${stats.avgWait}m`}
            icon={Clock}
            variant="warning"
          />
          <StatsCard 
            label={t.statServed} 
            value={stats.servedToday}
            icon={CheckCircle2}
            variant="success"
          />
          <div className="bg-[#EF4444] rounded-xl p-3 text-white">
            <Zap className="w-5 h-5 mb-1" />
            <p className="text-2xl font-bold">{stats.priorityNow}</p>
            <p className="text-xs text-white/80">{t.statPriority}</p>
          </div>
        </div>

        {/* Priority Queue Section */}
        {priorityQueue.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-[#EF4444]" />
              <h2 className="text-lg font-semibold text-foreground">{t.priorityQueue}</h2>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {priorityQueue.map((item, index) => {
                const isEmergency = item.priorityType === "emergency"
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-4 border-l-4",
                      isEmergency ? "border-l-[#EF4444]" : "border-l-[#F59E0B]",
                      index !== priorityQueue.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                        isEmergency ? "bg-[#EF4444]" : "bg-[#F59E0B]"
                      )}>
                        #P{item.position}
                      </div>
                      <div>
<div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full",
                            isEmergency ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {item.priorityCategory}
                          </span>
                          {item.isWalkIn && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                              {t.walkInBadge}
                            </span>
                          )}
                          {item.hasSpecialNeeds && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                          {/* Offline Badge */}
                          {isOffline && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                              {t.offlineBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.waitDuration === 0 ? t.justJoined : fmt(t.waitingMinutes, { min: item.waitDuration })}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleServe(item)}
                      className={cn(
                        "h-9",
                        isEmergency ? "bg-[#EF4444] hover:bg-red-600" : ""
                      )}
                      disabled={isOnBreak}
                    >
                      {isEmergency ? (
                        <>
                          <Shield className="w-4 h-4 mr-1" />
                          {t.serveNow}
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4 mr-1" />
                          {t.callBtn}
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Priority Rules Info */}
        <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-6">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            {t.priorityRulesInfo}
          </p>
        </div>

        {/* Standard Queue Section */}
        <div className="mb-32">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t.standardQueue}</h2>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {standardQueue.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between px-4 py-4",
                  index !== standardQueue.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-bold text-primary">#{item.position}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.isWalkIn && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                          {t.walkInBadge}
                        </span>
                      )}
                      {item.hasSpecialNeeds && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                      {/* Offline Badge on Standard Queue */}
                      {isOffline && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          Offline
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{fmt(t.waitingMinutes, { min: item.waitDuration })}</p>
                  </div>
                </div>
                {index === 0 && priorityQueue.length === 0 && (
                  <Button 
                    size="sm" 
                    onClick={() => handleServe(item)}
                    className="h-9"
                    disabled={isOnBreak}
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    {t.callBtn}
                  </Button>
                )}
              </div>
            ))}
            {standardQueue.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {staffLocationName
                    ? t.noOneWaiting
                    : t.askAdminForLocation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border space-y-3">
        <div className="relative">
          <Button 
            onClick={callNext}
            className={cn(
              "w-full h-14 text-base font-semibold",
              (isOffline || isOnBreak) && "opacity-50 cursor-not-allowed"
            )}
            disabled={isOnBreak || isOffline || (priorityQueue.length === 0 && standardQueue.length === 0)}
          >
            <Phone className="w-5 h-5 mr-2" />
            {t.callNextPerson}
          </Button>
          {isOffline && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              {t.reconnectToCallCustomers}
            </p>
          )}
          {isOnBreak && !isOffline && (
            <p className="text-center text-sm text-amber-600 mt-2">
              {t.returnFromBreakToServe}
            </p>
          )}
        </div>
        <div className="relative">
          <Button 
            variant="outline"
            onClick={() => !isOnBreak && setIsWalkInModalOpen(true)}
            className={cn(
              "w-full h-12 text-base font-medium border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white",
              isOnBreak && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-amber-600"
            )}
            disabled={isOnBreak}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            {t.addWalkInCustomer}
          </Button>
          {isOnBreak && (
            <p className="text-center text-sm text-amber-600 mt-2">
              {t.returnFromBreakToServe}
            </p>
          )}
        </div>
      </div>

      {/* Walk-in Modal */}
      <AddWalkInModal 
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onAddCustomer={handleAddWalkIn}
      />

      {/* Break Selection Modal - Part A */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-6 animate-in slide-in-from-bottom">
            <h2 className="text-xl font-bold text-foreground mb-1">{t.goingOnBreak}</h2>
            <p className="text-muted-foreground mb-6">{t.howLongAway}</p>

            {/* Duration Options */}
            <div className="space-y-3 mb-6">
              {[10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setBreakDuration(mins)
                    setCustomBreakDuration("")
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors",
                    breakDuration === mins 
                      ? "border-[#F59E0B] bg-amber-50" 
                      : "border-border hover:border-[#F59E0B]/50"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    breakDuration === mins ? "border-[#F59E0B]" : "border-muted-foreground"
                  )}>
                    {breakDuration === mins && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    )}
                  </span>
                  <span className="font-medium text-foreground">{mins} {t.minutesUnit}</span>
                </button>
              ))}

              {/* Custom Duration */}
              <div
                onClick={() => setBreakDuration(0)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer",
                  breakDuration === 0 
                    ? "border-[#F59E0B] bg-amber-50" 
                    : "border-border hover:border-[#F59E0B]/50"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  breakDuration === 0 ? "border-[#F59E0B]" : "border-muted-foreground"
                )}>
                  {breakDuration === 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  )}
                </span>
                <label htmlFor="custom-break-duration" className="font-medium text-foreground">{t.otherLabel}</label>
                <input
                  id="custom-break-duration"
                  type="number"
                  value={customBreakDuration}
                  onChange={(e) => {
                    setCustomBreakDuration(e.target.value)
                    setBreakDuration(0)
                  }}
                  placeholder={t.minPlaceholder}
                  className="w-16 h-8 px-2 border border-border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Message Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t.messageForQueueOptional}
              </label>
              <select
                value={breakMessage}
                onChange={(e) => setBreakMessage(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-input rounded-xl"
              >
                <option value="">{t.selectMessage}</option>
                {breakMessageOptions.map((msg, i) => (
                  <option key={i} value={msg}>{msg}</option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <Button 
              onClick={handleStartBreak}
              className="w-full h-14 text-base font-semibold bg-[#F59E0B] hover:bg-[#F59E0B]/90 mb-3"
            >
              {t.confirmBreak}
            </Button>
            <button
              onClick={() => setShowBreakModal(false)}
              className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Break End Overlay - Part B */}
      {showBreakEndOverlay && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Timer className="w-8 h-8 text-[#F59E0B]" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{t.breakHasEnded}</h2>
            <p className="text-muted-foreground mb-6">{t.returnToServeQueue}</p>
            <div className="space-y-3">
              <Button 
                onClick={handleResumeFromBreak}
                className="w-full h-12 bg-[#2563EB] hover:bg-[#2563EB]/90"
              >
                {t.imBackResumeService}
              </Button>
              <Button 
                variant="outline"
                onClick={handleExtendBreak}
                className="w-full h-12 border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
              >
                {t.extendBreakTenMin}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End Shift Modal - Part B */}
      {showEndShiftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-1">{t.endOfShiftSummary}</h2>
            <p className="text-sm text-gray-600 mb-1">{currentUser?.name}</p>
            <p className="text-sm text-gray-500 mb-5">
              {staffLocationName ?? t.noLocationAssigned} · {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long" })}
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span className="text-sm text-gray-700">{t.customersServedLabel}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#10B981]">{shiftSummary.customersServed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span className="text-sm text-gray-700">{t.avgServiceTimeLabel}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#10B981]">
                    {shiftSummary.avgServiceTime === null ? "—" : `${shiftSummary.avgServiceTime} min`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                    <span className="text-sm text-gray-700">{t.noShowsLabel}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#EF4444]">{shiftSummary.noShows}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 mt-4 pt-4">
                <p className="text-sm text-amber-600">{fmt(t.customersStillWaiting, { count: shiftSummary.queueRemaining })}</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t.notesForNextStaff}
              </label>
              <textarea
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder={t.handoverNotesPlaceholder}
                rows={3}
                className="w-full px-4 py-3 bg-background border border-input rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Actions */}
            <Button 
              onClick={handleEndShift}
              className="w-full h-[52px] text-base font-semibold bg-[#2563EB] hover:bg-[#2563EB]/90 mb-3"
            >
              {t.completeHandoverEndShift}
            </Button>
            <button
              onClick={() => setShowEndShiftModal(false)}
              className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2 text-sm"
            >
              {t.cancelStayOnShift}
            </button>
          </div>
        </div>
      )}

      {/* Shift Ended Toast */}
      {showShiftEndedToast && (
        <div className="fixed bottom-6 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
          <p className="text-center text-foreground">{t.shiftEndedHandoverSaved}</p>
        </div>
      )}

      {/* Print Ticket Modal - Part C */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[320px] bg-white rounded-2xl shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-foreground">{t.printTicket}</h3>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Print Preview - ticket-print class for print CSS */}
            <div className="p-4">
              <div className="ticket-print bg-white border-2 border-gray-300 rounded-xl p-6 font-mono text-center">
                <p className="text-xs text-gray-500 mb-2">QFlow — OFFLINE MODE</p>
                <p className="text-sm text-gray-700 mb-3">{staffLocationName ?? "QFlow location"}</p>
                
                <p className="text-gray-400 text-xs mb-2">─────────────────</p>
                
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">TICKET NUMBER</p>
                <p className="text-[72px] font-bold text-black leading-none mb-2">
                  {String(manualTicketNumber).padStart(3, "0")}
                </p>
                
                <p className="text-gray-400 text-xs mb-3">─────────────────</p>
                
                <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="text-sm text-gray-600 mb-3">Time: {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                
                <p className="text-sm text-gray-700 italic mb-3">
                  Please wait and listen for<br />your number to be called
                </p>
                
                <p className="text-xs text-gray-500 italic">
                  Digital system temporarily<br />unavailable — manual service
                </p>
              </div>
            </div>

            {/* Print Button */}
            <div className="px-4 pb-4">
              <Button
                onClick={handlePrintTicket}
                className="w-full h-12 bg-[#2563EB] hover:bg-[#2563EB]/90"
              >
                <Printer className="w-5 h-5 mr-2" />
                {t.printBtn}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
