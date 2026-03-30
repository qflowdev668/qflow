"use client"

import { useApp } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, User } from "lucide-react"
import { useState, useEffect } from "react"

export function StaffServingScreen() {
  const { currentlyServing, completeService, skipNoShow, navigateTo } = useApp()
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentlyServing) {
    navigateTo("staff-dashboard")
    return null
  }

  // Ticket #007 as specified
  const ticketNumber = "#007"
  const nextInQueue = "#008"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Green Header - Now Serving */}
      <div className="bg-success px-4 py-6">
        <div className="flex items-center justify-center gap-3">
          <CheckCircle2 className="w-7 h-7 text-white" />
          <h1 className="text-2xl font-bold text-white">Now Serving</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8">
        {/* Large Ticket Display */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 text-center mb-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-3">Ticket Number</p>
          <div className="text-8xl font-bold text-primary mb-6">
            {ticketNumber}
          </div>
          
          {/* Elapsed Time */}
          <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground">Elapsed:</span>
            <span className="font-mono font-semibold text-foreground text-lg">{formatTime(elapsedTime)}</span>
          </div>
        </div>

        {/* Next in Queue Preview Card */}
        <div className="bg-muted/50 rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Next in Queue</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center border-2 border-border">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">{nextInQueue}</p>
              <p className="text-sm text-muted-foreground">Waiting: 8 min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        {/* Complete Service - Green Button */}
        <Button 
          onClick={completeService}
          className="w-full h-14 text-base font-semibold bg-success hover:bg-success/90 rounded-xl"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Complete Service
        </Button>
        
        {/* Skip / No Show - Red Outlined Button */}
        <Button 
          variant="outline"
          onClick={skipNoShow}
          className="w-full h-12 text-base font-medium border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl"
        >
          <XCircle className="w-5 h-5 mr-2" />
          Skip / No Show
        </Button>
      </div>
    </div>
  )
}
