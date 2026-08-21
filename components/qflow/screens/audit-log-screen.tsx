"use client"

import { useEffect, useMemo, useState } from "react"
import { useApp } from "@/lib/app-context"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, Trash2, Edit2, Plus, KeyRound, ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/hooks/use-t"

type ActionType = "delete" | "edit" | "add" | "login"

interface AuditLogEntry {
  id: string
  action: ActionType
  title: string
  details: string
  admin: string
  createdAt: Date
}

/** The audit_log table stores free-text actions; bucket them for icons and filters. */
function classifyAction(action: string): ActionType {
  const value = action.toLowerCase()
  if (value.includes("delete") || value.includes("removed")) return "delete"
  if (value.includes("add") || value.includes("created")) return "add"
  if (value.includes("login") || value.includes("sign")) return "login"
  return "edit"
}

const actionConfig: Record<ActionType, {
  borderColor: string
  bgColor: string
  icon: typeof Trash2
  iconBg: string
}> = {
  delete: {
    borderColor: "border-l-red-400",
    bgColor: "bg-red-50",
    icon: Trash2,
    iconBg: "bg-red-100 text-red-600"
  },
  edit: {
    borderColor: "border-l-amber-400",
    bgColor: "bg-amber-50",
    icon: Edit2,
    iconBg: "bg-amber-100 text-amber-600"
  },
  add: {
    borderColor: "border-l-green-400",
    bgColor: "bg-green-50",
    icon: Plus,
    iconBg: "bg-green-100 text-green-600"
  },
  login: {
    borderColor: "border-l-blue-400",
    bgColor: "bg-blue-50",
    icon: KeyRound,
    iconBg: "bg-blue-100 text-blue-600"
  }
}

export function AuditLogScreen() {
  const { navigateTo } = useApp()
  const t = useT()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterAction, setFilterAction] = useState<"all" | ActionType>("all")
  const [filterTime, setFilterTime] = useState<"today" | "week" | "month" | "all">("all")
  const [filterAdmin, setFilterAdmin] = useState<string>("all")

  const [showActionDropdown, setShowActionDropdown] = useState(false)
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const [showAdminDropdown, setShowAdminDropdown] = useState(false)

  const actionLabels: Record<"all" | ActionType, string> = {
    all: t.allActions,
    delete: t.filterDelete,
    edit: t.filterEdit,
    add: t.filterAdd,
    login: t.filterLogin,
  }

  const timeLabels = {
    all: t.allTime,
    today: t.filterToday,
    week: t.filterThisWeek,
    month: t.filterThisMonth,
  }

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, action, detail, actor_name, created_at")
        .order("created_at", { ascending: false })
        .limit(200)

      if (cancelled) return
      setEntries(
        (data ?? []).map((row) => ({
          id: row.id,
          action: classifyAction(row.action),
          title: row.action,
          details: row.detail ?? "",
          admin: row.actor_name ?? "Unknown",
          createdAt: new Date(row.created_at),
        }))
      )
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const admins = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.admin))),
    [entries]
  )

  const filteredEntries = entries.filter((entry) => {
    if (filterAction !== "all" && entry.action !== filterAction) return false
    if (filterAdmin !== "all" && entry.admin !== filterAdmin) return false

    if (filterTime !== "all") {
      const cutoff = new Date()
      if (filterTime === "today") cutoff.setHours(0, 0, 0, 0)
      if (filterTime === "week") cutoff.setDate(cutoff.getDate() - 7)
      if (filterTime === "month") cutoff.setMonth(cutoff.getMonth() - 1)
      if (entry.createdAt < cutoff) return false
    }

    return true
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigateTo("admin-dashboard")}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">{t.systemAuditLog}</h1>
        </div>
      </header>

      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="relative">
            <button
              onClick={() => {
                setShowActionDropdown(!showActionDropdown)
                setShowTimeDropdown(false)
                setShowAdminDropdown(false)
              }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap",
                filterAction !== "all" 
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-foreground border-border"
              )}
            >
              {actionLabels[filterAction]}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showActionDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 w-32 overflow-hidden">
                {(["all", "delete", "edit", "add", "login"] as const).map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      setFilterAction(action)
                      setShowActionDropdown(false)
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                      filterAction === action && "bg-muted font-medium"
                    )}
                  >
                    {actionLabels[action]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowTimeDropdown(!showTimeDropdown)
                setShowActionDropdown(false)
                setShowAdminDropdown(false)
              }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap",
                filterTime !== "all" 
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-foreground border-border"
              )}
            >
              {timeLabels[filterTime]}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showTimeDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 w-32 overflow-hidden">
                {(["all", "today", "week", "month"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setFilterTime(value)
                      setShowTimeDropdown(false)
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                      filterTime === value && "bg-muted font-medium"
                    )}
                  >
                    {timeLabels[value]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowAdminDropdown(!showAdminDropdown)
                setShowActionDropdown(false)
                setShowTimeDropdown(false)
              }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap",
                filterAdmin !== "all" 
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-foreground border-border"
              )}
            >
              {filterAdmin === "all" ? t.allAdmins : filterAdmin}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showAdminDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 w-40 overflow-hidden">
                {["all", ...admins].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setFilterAdmin(option)
                      setShowAdminDropdown(false)
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                      filterAdmin === option && "bg-muted font-medium"
                    )}
                  >
                    {option === "all" ? t.allAdmins : option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {filteredEntries.map((entry) => {
          const config = actionConfig[entry.action]
          const Icon = config.icon
          
          return (
            <div 
              key={entry.id}
              className={cn(
                "bg-white rounded-xl border-l-4 p-3",
                config.borderColor
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  config.iconBg
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{entry.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{entry.details}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {entry.admin} ·{" "}
                    {entry.createdAt.toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    {entry.createdAt.toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!isLoading && filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {entries.length === 0
                ? t.noAdminActivityYet
                : t.noEntriesMatchFilters}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
