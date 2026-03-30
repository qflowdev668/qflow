"use client"

import { useApp } from "@/lib/app-context"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { 
  User, 
  Mail, 
  Settings, 
  Bell, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

export function ProfileScreen() {
  const { currentUser, logout, queueHistory, navigateTo } = useApp()

  const menuItems = [
    { icon: User, label: "Edit Profile", onClick: () => {} },
    { icon: Bell, label: "Notifications", onClick: () => navigateTo("notifications") },
    { icon: HelpCircle, label: "Help & Support", onClick: () => {} },
  ]

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date)
  }

  const statusIcons = {
    completed: <CheckCircle2 className="w-5 h-5 text-success" />,
    cancelled: <XCircle className="w-5 h-5 text-destructive" />,
    "no-show": <Clock className="w-5 h-5 text-muted-foreground" />
  }

  const statusLabels = {
    completed: "Completed",
    cancelled: "Cancelled",
    "no-show": "No Show"
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary px-4 pt-8 pb-12">
        <h1 className="text-xl font-bold text-white mb-6">Profile</h1>
        
        {/* Avatar & Info */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {currentUser?.name.split(" ").map(n => n[0]).join("").toUpperCase() || "TM"}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{currentUser?.name || "Thabo Mbeki"}</h2>
            <p className="text-white/80 text-sm">{currentUser?.email || "thabo@example.com"}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white capitalize">
              {currentUser?.role || "user"}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 -mt-4">
        {/* Menu Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                "w-full flex items-center justify-between px-4 py-4 hover:bg-muted transition-colors",
                index !== menuItems.length - 1 && "border-b border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Queue History */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Queue History</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {queueHistory.length > 0 ? (
              queueHistory.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-4",
                    index !== queueHistory.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {statusIcons[item.status]}
                    <div>
                      <p className="font-medium text-foreground">{item.locationName}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    item.status === "completed" && "bg-success/10 text-success",
                    item.status === "cancelled" && "bg-destructive/10 text-destructive",
                    item.status === "no-show" && "bg-muted text-muted-foreground"
                  )}>
                    {statusLabels[item.status]}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No queue history yet
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-destructive/10 rounded-xl text-destructive font-medium hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground mt-6 mb-4">
          QFlow v1.0.0
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
