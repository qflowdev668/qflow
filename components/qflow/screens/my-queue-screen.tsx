"use client"

import { useApp } from "@/lib/app-context"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, AlertCircle, Building2 } from "lucide-react"

export function MyQueueScreen() {
  const { activeQueue, leaveQueue, navigateTo } = useApp()

  // Use position 5 as specified, with 4 people ahead
  const queueData = activeQueue || {
    locationId: "1",
    locationName: "Hillbrow Clinic",
    locationAddress: "123 Pretoria St, Hillbrow, Johannesburg",
    position: 5,
    estimatedWait: 20,
    joinedAt: new Date(),
    status: "waiting" as const,
    totalInQueue: 12
  }

  const peopleAhead = queueData.position - 1

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

  // Calculate progress for circular indicator
  const progress = ((queueData.totalInQueue - queueData.position + 1) / queueData.totalInQueue) * 100
  const circumference = 2 * Math.PI * 70
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Amber Status Banner */}
      <div className="bg-secondary/10 border-b border-secondary/20 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse" />
          <p className="text-foreground font-semibold">
            {"You're in the queue"} — <span className="text-secondary">{peopleAhead} {peopleAhead === 1 ? "person" : "people"} ahead</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        {/* Large Position Number with Circular Progress */}
        <div className="flex flex-col items-center mb-8">
          {/* Circular Progress Indicator */}
          <div className="relative w-48 h-48 mb-4">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset
                }}
              />
            </svg>
            {/* Position number in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Position</p>
              <p className="text-6xl font-bold text-foreground">#{queueData.position}</p>
            </div>
          </div>

          {/* Estimated Wait */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span className="text-lg">~<strong className="text-foreground">{queueData.estimatedWait} min</strong> estimated wait</span>
          </div>
        </div>

        {/* Location Info Card */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{queueData.locationName}</h3>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{queueData.locationAddress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Pulse Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          <span>Live updates active</span>
        </div>

        {/* Red Outlined Leave Queue Button */}
        <Button 
          variant="outline"
          onClick={leaveQueue}
          className="w-full h-14 text-base font-semibold border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl"
        >
          <AlertCircle className="w-5 h-5 mr-2" />
          Leave Queue
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}
