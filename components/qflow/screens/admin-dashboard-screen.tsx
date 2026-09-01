"use client"

import { useApp } from "@/lib/app-context"
import { createClient } from "@/lib/supabase/client"
import { StatsCard } from "@/components/qflow/stats-card"
import { Button } from "@/components/ui/button"
import { 
  MapPin, 
  Users, 
  Activity, 
  UserCheck, 
  Plus, 
  LogOut,
  Edit2,
  Trash2,
  MoreVertical,
  AlertTriangle,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  RefreshCw,
  Monitor,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Shield
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCallback, useEffect, useState } from "react"
import { fmt, useT } from "@/hooks/use-t"

const typeColors = {
  clinic: "bg-blue-100 text-blue-700",
  bank: "bg-amber-100 text-amber-700",
  government: "bg-emerald-100 text-emerald-700",
  other: "bg-gray-100 text-gray-700"
}

// Get capacity status for admin view
function getCapacityStatus(
  queueCount: number,
  capacity: number,
  labels: { queueFull: string; percentFull: (pct: number) => string }
) {
  const percentage = (queueCount / capacity) * 100
  if (percentage >= 100) {
    return { label: labels.queueFull, badgeClass: "bg-red-100 text-red-700", dotClass: "bg-red-500", level: "full" }
  } else if (percentage >= 75) {
    return { label: labels.percentFull(Math.round(percentage)), badgeClass: "bg-amber-100 text-amber-700", dotClass: "bg-amber-500", level: "high" }
  } else {
    return { label: labels.percentFull(Math.round(percentage)), badgeClass: "bg-green-100 text-green-700", dotClass: "bg-green-500", level: "good" }
  }
}

interface AdminMetrics {
  usersToday: number
  staffAccounts: number
  avgWaitMinutes: number | null
  fastest: { name: string; minutes: number } | null
  slowest: { name: string; minutes: number } | null
  peakHour: number | null
  quietestHour: number | null
}

const emptyMetrics: AdminMetrics = {
  usersToday: 0,
  staffAccounts: 0,
  avgWaitMinutes: null,
  fastest: null,
  slowest: null,
  peakHour: null,
  quietestHour: null,
}

function formatHourRange(hour: number) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${pad(hour)}:00 - ${pad((hour + 1) % 24)}:00`
}

export function AdminDashboardScreen() {
  const {
    currentUser,
    logout,
    locations,
    deleteLocation,
    navigateTo,
    setEditingLocation,
    supabaseEnabled,
    lastSyncedAt,
    refreshLocations,
  } = useApp()
  const t = useT()
  const typeLabels = {
    clinic: t.typeClinic,
    bank: t.typeBank,
    government: t.typeGovernment,
    other: t.typeOther,
  }
  const capacityLabels = {
    queueFull: t.queueFull,
    percentFull: (pct: number) => fmt(t.percentFull, { pct }),
  }
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  
  // Delete confirmation state - Part A
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    locationId: string
    locationName: string
    queueCount: number
  } | null>(null)
  const [deleteTypedName, setDeleteTypedName] = useState("")
  const [showDeletedToast, setShowDeletedToast] = useState<{ name: string; count: number } | null>(null)
  
  // High impact warning state - Part D
  const [highImpactWarning, setHighImpactWarning] = useState<{
    isOpen: boolean
    action: string
    locationName: string
    affectedUsers: number
    onProceed: () => void
  } | null>(null)

  const [showHealthPanel, setShowHealthPanel] = useState(true)
  const [metrics, setMetrics] = useState<AdminMetrics>(emptyMetrics)
  const [isDatabaseReachable, setIsDatabaseReachable] = useState(supabaseEnabled)

  const loadMetrics = useCallback(async () => {
    const supabase = createClient()
    if (!supabase) {
      setMetrics(emptyMetrics)
      setIsDatabaseReachable(false)
      return
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [entriesResult, staffResult] = await Promise.all([
      supabase
        .from("queue_entries")
        .select("location_id, joined_at, served_at, status")
        .gte("joined_at", startOfDay.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "staff"),
    ])

    if (entriesResult.error) {
      setIsDatabaseReachable(false)
      return
    }
    setIsDatabaseReachable(true)

    const entries = entriesResult.data ?? []
    const waitsByLocation = new Map<string, number[]>()
    const joinsByHour = new Array<number>(24).fill(0)

    for (const entry of entries) {
      joinsByHour[new Date(entry.joined_at).getHours()] += 1
      if (entry.status !== "served" || !entry.served_at) continue
      const minutes =
        (new Date(entry.served_at).getTime() - new Date(entry.joined_at).getTime()) / 60000
      const bucket = waitsByLocation.get(entry.location_id) ?? []
      bucket.push(minutes)
      waitsByLocation.set(entry.location_id, bucket)
    }

    const averages = [...waitsByLocation.entries()]
      .map(([locationId, waits]) => ({
        name: locations.find((loc) => loc.id === locationId)?.name ?? "Unknown location",
        minutes: Math.round((waits.reduce((sum, w) => sum + w, 0) / waits.length) * 10) / 10,
      }))
      .sort((a, b) => a.minutes - b.minutes)

    const allWaits = [...waitsByLocation.values()].flat()
    const hasJoins = joinsByHour.some((count) => count > 0)

    setMetrics({
      usersToday: entries.length,
      staffAccounts: staffResult.count ?? 0,
      avgWaitMinutes: allWaits.length
        ? Math.round((allWaits.reduce((sum, w) => sum + w, 0) / allWaits.length) * 10) / 10
        : null,
      fastest: averages.length > 1 ? averages[0] : null,
      slowest: averages.length > 1 ? averages[averages.length - 1] : null,
      peakHour: hasJoins ? joinsByHour.indexOf(Math.max(...joinsByHour)) : null,
      quietestHour: hasJoins ? joinsByHour.indexOf(Math.min(...joinsByHour.filter((c) => c > 0))) : null,
    })
  }, [locations])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  const locationLoads = locations.map((location) => ({
    id: location.id,
    name: location.name,
    load: Math.round((location.queueCount / Math.max(location.capacity, 1)) * 100),
    queueCount: location.queueCount,
    capacity: location.capacity,
  }))

  const highLoadLocation = locationLoads.find(l => l.load >= 95)
  const alternativeLocation = locationLoads.find(l => l.load < 50)

  const handleRefreshHealth = () => {
    void refreshLocations()
    void loadMetrics()
  }
  
  const getLoadColor = (load: number) => {
    if (load < 60) return "bg-[#10B981]"
    if (load < 80) return "bg-[#F59E0B]"
    if (load < 95) return "bg-[#F97316]"
    return "bg-[#EF4444]"
  }
  
  const getLoadTextColor = (load: number) => {
    if (load < 60) return "text-[#10B981]"
    if (load < 80) return "text-[#F59E0B]"
    if (load < 95) return "text-[#F97316]"
    return "text-[#EF4444]"
  }

  const stats = {
    totalLocations: locations.length,
    activeQueues: locations.filter(l => l.isOpen && l.queueCount > 0).length,
    usersToday: metrics.usersToday,
    staffAccounts: metrics.staffAccounts,
  }

  // Calculate capacity alerts
  const capacityAlerts = locations.map(loc => ({
    ...loc,
    status: getCapacityStatus(loc.queueCount, loc.capacity, capacityLabels)
  })).sort((a, b) => {
    // Sort by severity: full > high > good
    const order = { full: 0, high: 1, good: 2 }
    return order[a.status.level as keyof typeof order] - order[b.status.level as keyof typeof order]
  })

  const fullQueues = capacityAlerts.filter(l => l.status.level === "full").length
  const highQueues = capacityAlerts.filter(l => l.status.level === "high").length

  const handleAddLocation = () => {
    setEditingLocation(null)
    navigateTo("add-location")
  }

  const handleScrollToLocations = () => {
    document.getElementById("admin-locations")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleEditLocation = (locationId: string) => {
    const location = locations.find(l => l.id === locationId)
    if (location) {
      setEditingLocation(location)
      navigateTo("add-location")
    }
    setOpenMenu(null)
  }

  const handleDeleteLocation = (locationId: string) => {
    const location = locations.find(l => l.id === locationId)
    if (!location) return

    // Check for high impact (5+ users affected)
    if (location.queueCount >= 5) {
      setHighImpactWarning({
        isOpen: true,
        action: "delete",
        locationName: location.name,
        affectedUsers: location.queueCount,
        onProceed: () => {
          setHighImpactWarning(null)
          // Show delete confirmation
          setDeleteConfirmation({
            isOpen: true,
            locationId: location.id,
            locationName: location.name,
            queueCount: location.queueCount
          })
        }
      })
      setOpenMenu(null)
      return
    }
    
    // Show delete confirmation directly
    setDeleteConfirmation({
      isOpen: true,
      locationId: location.id,
      locationName: location.name,
      queueCount: location.queueCount
    })
    setOpenMenu(null)
  }
  
  const confirmDelete = () => {
    if (!deleteConfirmation) return
    
    deleteLocation(deleteConfirmation.locationId)
    setShowDeletedToast({
      name: deleteConfirmation.locationName,
      count: deleteConfirmation.queueCount
    })
    setDeleteConfirmation(null)
    setDeleteTypedName("")
    
    // Hide toast after 4 seconds
    setTimeout(() => setShowDeletedToast(null), 4000)
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="bg-primary px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{t.adminPanel}</h1>
            <div className="flex items-center gap-2">
              <p className="text-white/80 text-sm">{currentUser?.name}</p>
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {t.adminBadge}
              </span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Quick Links - Part B */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleScrollToLocations}
            className="flex-1 min-w-[30%] bg-white/10 hover:bg-white/20 rounded-xl p-3 text-white text-sm font-medium transition-colors"
          >
            <MapPin className="w-5 h-5 mx-auto mb-1" />
            {t.navLocations}
          </button>
          <button
            type="button"
            onClick={() => navigateTo("manage-staff")}
            className="flex-1 min-w-[30%] bg-white/10 hover:bg-white/20 rounded-xl p-3 text-white text-sm font-medium transition-colors"
          >
            <UserCheck className="w-5 h-5 mx-auto mb-1" />
            {t.manageStaff}
          </button>
          <button
            type="button"
            onClick={() => navigateTo("manage-admins")}
            className="flex-1 min-w-[30%] bg-white/10 hover:bg-white/20 rounded-xl p-3 text-white text-sm font-medium transition-colors"
          >
            <Shield className="w-5 h-5 mx-auto mb-1" />
            {t.manageAdmins}
          </button>
          <button 
            type="button"
            onClick={() => navigateTo("audit-log")}
            className="flex-1 min-w-[30%] bg-white/10 hover:bg-white/20 rounded-xl p-3 text-white text-sm font-medium transition-colors"
          >
            <ClipboardList className="w-5 h-5 mx-auto mb-1" />
            {t.navAuditLog}
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatsCard 
            label={t.totalLocations} 
            value={stats.totalLocations}
            icon={MapPin}
            variant="primary"
          />
          <StatsCard 
            label={t.activeQueues} 
            value={stats.activeQueues}
            icon={Activity}
            variant="success"
          />
          <StatsCard 
            label={t.usersToday} 
            value={stats.usersToday}
            icon={Users}
            variant="warning"
          />
          <button
            type="button"
            onClick={() => navigateTo("manage-staff")}
            className="text-left"
          >
            <StatsCard
              label={t.staffAccounts}
              value={stats.staffAccounts}
              icon={UserCheck}
            />
          </button>
        </div>

        {/* Service Performance Card - Part D */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t.todaysPerformance}</h2>
          </div>

          {metrics.avgWaitMinutes === null && metrics.peakHour === null ? (
            <p className="text-sm text-muted-foreground py-2">
              {t.noPerformanceDataYet}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t.avgWaitBeforeServed}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {metrics.avgWaitMinutes === null ? "—" : `${metrics.avgWaitMinutes} min`}
                </span>
              </div>
              {metrics.fastest && (
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-[#10B981]" />
                    <span className="text-sm text-muted-foreground">{t.fastestLocation}</span>
                  </div>
                  <span className="text-sm font-medium text-[#10B981]">
                    {metrics.fastest.name} ({metrics.fastest.minutes} min)
                  </span>
                </div>
              )}
              {metrics.slowest && (
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#F97316]" />
                    <span className="text-sm text-muted-foreground">{t.slowestLocation}</span>
                  </div>
                  <span className="text-sm font-medium text-[#F97316]">
                    {metrics.slowest.name} ({metrics.slowest.minutes} min)
                  </span>
                </div>
              )}
              {metrics.peakHour !== null && (
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#EF4444]" />
                    <span className="text-sm text-muted-foreground">{t.peakHourToday}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {formatHourRange(metrics.peakHour)}
                  </span>
                </div>
              )}
              {metrics.quietestHour !== null && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#10B981]" />
                    <span className="text-sm text-muted-foreground">{t.quietestPeriod}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {formatHourRange(metrics.quietestHour)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Capacity Alerts Card - Part C */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">{t.capacityAlerts}</h2>
          </div>
          
          {/* Alert Summary */}
          {(fullQueues > 0 || highQueues > 0) && (
            <div className="flex gap-3 mb-4">
              {fullQueues > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-700">{fullQueues} {t.alertFull}</span>
                </div>
              )}
              {highQueues > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-amber-700">{highQueues} {t.alertHigh}</span>
                </div>
              )}
            </div>
          )}

          {/* Location Status List */}
          <div className="space-y-2">
            {capacityAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                {t.noLocationsCapacityHint}
              </p>
            )}
            {capacityAlerts.map((location) => (
              <div 
                key={location.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", location.status.dotClass)} />
                  <span className="text-sm font-medium text-foreground">{location.name}</span>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  location.status.badgeClass
                )}>
                  {location.status.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* High Load Alert Card - Part B */}
        {highLoadLocation && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-[#EF4444] mb-2">{fmt(t.highLoadTitle, { name: highLoadLocation.name })}</h3>
                <p className="text-sm text-red-700 leading-relaxed">
                  {fmt(t.highLoadQueueAt, { count: highLoadLocation.queueCount, capacity: highLoadLocation.capacity })}<br />
                  {alternativeLocation && (
                    <>{t.considerRedirecting}<br />
                    • {alternativeLocation.name} ({fmt(t.loadLabel, { pct: alternativeLocation.load })})</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* System Health Panel - Part A */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <button 
            onClick={() => setShowHealthPanel(!showHealthPanel)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              {t.systemHealth}
            </h3>
            {showHealthPanel ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          {showHealthPanel && (
            <div className="mt-4">
              {/* Status Rows */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{t.databaseLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", isDatabaseReachable ? "bg-[#10B981]" : "bg-[#EF4444]")} />
                    <span className={cn("text-sm", isDatabaseReachable ? "text-[#10B981]" : "text-[#EF4444]")}>
                      {isDatabaseReachable ? t.connected : t.unreachable}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{t.realtimeSync}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", supabaseEnabled ? "bg-[#10B981]" : "bg-gray-400")} />
                    <span className={cn("text-sm", supabaseEnabled ? "text-[#10B981]" : "text-gray-500")}>
                      {supabaseEnabled ? t.syncActive : t.notConfigured}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm font-medium text-gray-600 mb-3">{t.locationLoad}</p>
                <div className="space-y-4">
                  {locationLoads.length === 0 && (
                    <p className="text-sm text-gray-500">{t.noLocationsMonitor}</p>
                  )}
                  {locationLoads.map((loc) => (
                    <div key={loc.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{loc.name}</span>
                        <span className={cn("text-sm font-medium", getLoadTextColor(loc.load))}>
                          {fmt(t.loadLabel, { pct: loc.load })} {loc.load >= 95 ? "⚠️" : "✓"}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", getLoadColor(loc.load))}
                          style={{ width: `${Math.min(loc.load, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-500">
                  {t.lastUpdated}{" "}
                  {lastSyncedAt
                    ? lastSyncedAt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
                <button 
                  onClick={handleRefreshHealth}
                  className="text-sm text-[#2563EB] hover:text-[#2563EB]/80 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t.refreshBtn}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Locations List */}
        <div id="admin-locations" className="mb-6 scroll-mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">{t.locationsTitle}</h2>
            <Button size="sm" onClick={handleAddLocation}>
              <Plus className="w-4 h-4 mr-1" />
              {t.addNew}
            </Button>
          </div>

          <div className="space-y-3">
            {locations.length === 0 && (
              <div className="bg-card rounded-xl border border-dashed border-border p-8 text-center">
                <MapPin className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t.noLocationsEmptyHint}
                </p>
              </div>
            )}
            {locations.map((location) => {
              const capacityStatus = getCapacityStatus(location.queueCount, location.capacity, capacityLabels)
              const percentage = Math.round((location.queueCount / location.capacity) * 100)
              
              return (
                <div 
                  key={location.id}
                  className="bg-card rounded-xl border border-border p-4 relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{location.name}</h3>
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                          typeColors[location.type]
                        )}>
                          {typeLabels[location.type]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{fmt(t.inQueueCount, { count: location.queueCount })}</span>
                        <span>{t.capacityField}: {location.capacity}</span>
                        <span className={location.isOpen ? "text-success" : "text-destructive"}>
                          {location.isOpen ? t.openStatus : t.closedStatus}
                        </span>
                      </div>

                      {/* Capacity Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{location.queueCount}/{location.capacity}</span>
                          <span className={cn(
                            "font-medium",
                            capacityStatus.level === "full" ? "text-red-600" :
                            capacityStatus.level === "high" ? "text-amber-600" : "text-green-600"
                          )}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              capacityStatus.level === "full" ? "bg-red-500 animate-pulse" :
                              capacityStatus.level === "high" ? "bg-amber-500" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setOpenMenu(openMenu === location.id ? null : location.id)}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-muted-foreground" />
                      </button>

                      {openMenu === location.id && (
                        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 w-44 overflow-hidden">
                          <button
                            onClick={() => handleEditLocation(location.id)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            {t.editBtn}
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(location.id)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t.deleteLocationBtn}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={handleAddLocation}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Delete Confirmation Modal - Part A */}
      {deleteConfirmation?.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
            </div>
            
            <h3 className="text-lg font-bold text-foreground text-center mb-4">{t.deleteLocationTitle}</h3>
            
            <div className="text-sm text-gray-700 mb-6">
              <p className="mb-3">{t.aboutToDelete}</p>
              <p className="font-semibold text-foreground mb-3">{deleteConfirmation.locationName}</p>
              <p className="mb-2">{t.willAlsoRemove}</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>{fmt(t.activeQueueEntries, { count: deleteConfirmation.queueCount })}</li>
                <li>{t.allHistoricalData}</li>
                <li>{t.allStaffAssignments}</li>
              </ul>
              <p className="mt-3 font-medium text-[#EF4444]">{t.cannotBeUndone}</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-2">
                {t.typeNameToConfirm}
              </label>
              <Input
                type="text"
                value={deleteTypedName}
                onChange={(e) => setDeleteTypedName(e.target.value)}
                placeholder={`e.g. ${deleteConfirmation.locationName}`}
                className={cn(
                  "h-11",
                  deleteTypedName === deleteConfirmation.locationName 
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                    : deleteTypedName.length > 0 
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-200"
                )}
              />
            </div>
            
            <Button
              onClick={confirmDelete}
              disabled={deleteTypedName !== deleteConfirmation.locationName}
              className={cn(
                "w-full h-[52px] bg-[#EF4444] hover:bg-[#EF4444]/90 mb-3",
                deleteTypedName !== deleteConfirmation.locationName && "opacity-50 cursor-not-allowed"
              )}
            >
              {t.deletePermanently}
            </Button>
            
            <button
              onClick={() => {
                setDeleteConfirmation(null)
                setDeleteTypedName("")
              }}
              className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2 text-sm"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* High Impact Warning Modal - Part D */}
      {highImpactWarning?.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-center mb-4">
              <Users className="w-8 h-8 text-[#F59E0B]" />
            </div>
            
            <h3 className="text-lg font-bold text-foreground text-center mb-4">{t.highImpactTitle}</h3>
            
            <div className="text-sm text-gray-700 mb-6">
              <p className="mb-3">
                {fmt(t.highImpactBody, {
                  count: highImpactWarning.affectedUsers,
                  name: highImpactWarning.locationName,
                })}
              </p>
            </div>
            
            <Button
              onClick={highImpactWarning.onProceed}
              className="w-full h-[52px] bg-[#EF4444] hover:bg-[#EF4444]/90 mb-3"
            >
              {t.proceedAnyway}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setHighImpactWarning(null)}
              className="w-full h-[52px] border-gray-300"
            >
              {t.cancel}
            </Button>
          </div>
        </div>
      )}

      {/* Deleted Toast - Part A */}
      {showDeletedToast && (
        <div className="fixed bottom-6 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
          <p className="text-center text-foreground">
            {fmt(t.locationDeletedToast, { name: showDeletedToast.name, count: showDeletedToast.count })}
          </p>
        </div>
      )}
    </div>
  )
}
