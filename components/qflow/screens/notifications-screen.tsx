"use client"

import { useApp } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Users, Bell, Star, Info, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap = {
  queue: Users,
  turn: Bell,
  feedback: Star,
  info: Info
}

const iconColors = {
  queue: "bg-primary/10 text-primary",
  turn: "bg-secondary/10 text-secondary",
  feedback: "bg-success/10 text-success",
  info: "bg-muted text-muted-foreground"
}

export function NotificationsScreen() {
  const { notifications, markNotificationRead, markAllNotificationsRead, navigateTo, currentUser } = useApp()

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationClick = (id: string) => {
    markNotificationRead(id)
  }

  const getBackTo = () => {
    if (currentUser?.role === "admin") return "admin-dashboard"
    if (currentUser?.role === "staff") return "staff-dashboard"
    return "home"
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        title="Notifications" 
        showBack 
        backTo={getBackTo()}
        rightContent={
          unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1 text-sm text-primary font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )
        }
      />

      <div className="px-4 py-4">
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.icon]
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors",
                    notification.read 
                      ? "bg-card border-border" 
                      : "bg-primary/5 border-primary/20"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    iconColors[notification.icon]
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-foreground leading-relaxed",
                      !notification.read && "font-medium"
                    )}>
                      {notification.message}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
            <p className="text-muted-foreground text-center">
              {"You're all caught up! Check back later for updates."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
