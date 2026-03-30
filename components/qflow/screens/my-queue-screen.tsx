"use client"

import { useApp } from "@/lib/app-context"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { QueueStatusBadge } from "@/components/qflow/queue-status-badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function MyQueueScreen() {
  const { activeQueue, leaveQueue, navigateTo } = useApp()

  if (!activeQueue) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">My Queue</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Clock className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No Active Queue</h2>
          <p className="text-muted-foreground text-center mb-6">
            {"You're not in any queue right now. Find a location and join to get started."}
          </p>
          <Button onClick={() => navigateTo("home")} className="px-8">
            Find a Location
          </Button>
        </div>

        <BottomNav />
      </div>
    )
  }

  const statusBannerStyles = {
    waiting: "bg-amber-50 border-amber-200",
    almost: "bg-blue-50 border-blue-200",
    "your-turn": "bg-emerald-50 border-emerald-200",
    served: "bg-gray-50 border-gray-200"
  }

  const statusMessages = {
    waiting: "You're in the queue",
    almost: `Get ready! ${activeQueue.position} ${activeQueue.position === 1 ? "person" : "people"} ahead`,
    "your-turn": "It's your turn! Head in now",
    served: "You've been served"
  }

  const progress = ((activeQueue.totalInQueue - activeQueue.position + 1) / activeQueue.totalInQueue) * 100

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Status Banner */}
      <div className={cn(
        "px-4 py-6 border-b",
        statusBannerStyles[activeQueue.status]
      )}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">My Queue</h1>
          <QueueStatusBadge status={activeQueue.status} />
        </div>
        <p className="text-foreground font-medium">
          {statusMessages[activeQueue.status]}
        </p>
      </div>

      {/* Queue Position */}
      <div className="px-4 py-8">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 text-center mb-6">
          <p className="text-sm text-muted-foreground mb-2">Your Position</p>
          <div className="text-7xl font-bold text-primary mb-4">
            #{activeQueue.position}
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Position {activeQueue.position}</span>
              <span>{activeQueue.totalInQueue} total</span>
            </div>
          </div>

          {/* Estimated Wait */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span>Estimated wait: <strong className="text-foreground">~{activeQueue.estimatedWait} min</strong></span>
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <h3 className="font-semibold text-foreground mb-3">{activeQueue.locationName}</h3>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{activeQueue.locationAddress}</span>
          </div>
        </div>

        {/* Live Updates Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span>Receiving live updates</span>
        </div>

        {/* Leave Queue Button */}
        <Button 
          variant="outline"
          onClick={leaveQueue}
          className="w-full h-12 border-destructive text-destructive hover:bg-destructive hover:text-white"
        >
          <AlertCircle className="w-5 h-5 mr-2" />
          Leave Queue
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}
