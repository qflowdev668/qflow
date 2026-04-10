"use client"

import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, User, AlertTriangle, Shield, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

type PriorityType = "emergency" | "fast-track" | "standard"

export function StaffServingScreen() {
  const { currentlyServing, completeService, skipNoShow, navigateTo } = useApp()
  const [elapsedTime, setElapsedTime] = useState(0)

  // Mock priority customer state (in real app, this would come from context/backend)
  // Toggle these to see different states
  const priorityType: PriorityType = "emergency" // "emergency" | "fast-track" | "standard"
  const isEmergency = priorityType === "emergency"
  const isFastTrack = priorityType === "fast-track"
  const isWalkInCustomer = !isEmergency && !isFastTrack

  const emergencyCustomerInfo = {
    name: "Sgt. N. Dlamini",
    organization: "South African Police Service",
    category: "Police"
  }

  const fastTrackCustomerInfo = {
    name: "Thembi K.",
    category: "School Learner"
  }

  const walkInCustomerInfo = {
    name: "Thabo M.",
    specialNeeds: "Elderly"
  }

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
      {/* Header - Color based on priority */}
      <div className={cn(
        "px-4 py-6",
        isEmergency ? "bg-[#EF4444]" : isFastTrack ? "bg-[#F59E0B]" : "bg-success"
      )}>
        <div className="flex items-center justify-center gap-3">
          {isEmergency ? (
            <>
              <Shield className="w-7 h-7 text-white" />
              <div className="text-center">
                <h1 className="text-xl font-bold text-white">EMERGENCY PRIORITY</h1>
                <p className="text-white/90 text-sm">Serve Immediately</p>
              </div>
            </>
          ) : isFastTrack ? (
            <>
              <Zap className="w-7 h-7 text-white" />
              <h1 className="text-2xl font-bold text-white">Priority Fast-Track</h1>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-7 h-7 text-white" />
              <h1 className="text-2xl font-bold text-white">Now Serving</h1>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8">
        {/* Emergency Priority Display */}
        {isEmergency && (
          <div className="bg-card rounded-2xl border-2 border-[#EF4444] shadow-lg p-6 text-center mb-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Emergency Personnel</p>
            <p className="text-2xl font-bold text-foreground mb-1">{emergencyCustomerInfo.name}</p>
            <p className="text-sm text-muted-foreground mb-4">{emergencyCustomerInfo.organization}</p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full mb-4">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">{emergencyCustomerInfo.category}</span>
            </div>
            
            {/* Elapsed Time */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span>Elapsed:</span>
              <span className="font-mono font-semibold text-foreground text-lg">{formatTime(elapsedTime)}</span>
            </div>
          </div>
        )}

        {/* Emergency Warning Card */}
        {isEmergency && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 mb-2">This customer has emergency priority</p>
                <p className="text-sm text-red-700 leading-relaxed">
                  Please provide immediate service. Verify official ID or badge before serving.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fast-Track Priority Display */}
        {isFastTrack && (
          <>
            <div className="bg-card rounded-2xl border border-border shadow-lg p-8 text-center mb-6">
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-3">Ticket Number</p>
              <div className="text-8xl font-bold text-[#F59E0B] mb-4">
                {ticketNumber}
              </div>
              
              <p className="text-lg font-semibold text-foreground mb-1">{fastTrackCustomerInfo.name}</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full mb-4">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">{fastTrackCustomerInfo.category}</span>
              </div>
              
              {/* Elapsed Time */}
              <div className="flex items-center justify-center gap-2 bg-muted px-4 py-2 rounded-full">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Elapsed:</span>
                <span className="font-mono font-semibold text-foreground text-lg">{formatTime(elapsedTime)}</span>
              </div>
            </div>

            {/* Fast-Track Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 mb-1">Priority Fast-Track Customer</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    Please verify uniform or supporting document before completing service.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Standard/Walk-in Display */}
        {!isEmergency && !isFastTrack && (
          <>
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

            {/* Walk-in Customer Notice */}
            {isWalkInCustomer && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-2">Walk-in Customer</p>
                    <div className="space-y-1 text-sm text-amber-700">
                      <p><span className="text-amber-600">Name:</span> {walkInCustomerInfo.name}</p>
                      <p><span className="text-amber-600">Special needs:</span> {walkInCustomerInfo.specialNeeds}</p>
                    </div>
                    <p className="text-sm text-amber-700 mt-3 leading-relaxed">
                      Please call this customer by name or announce {ticketNumber} at the counter — they have no app notifications.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

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
        {isEmergency ? (
          <>
            {/* Complete Service - Green Button */}
            <Button 
              onClick={completeService}
              className="w-full h-14 text-base font-semibold bg-success hover:bg-success/90 rounded-xl"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Service Complete
            </Button>
            
            {/* Could Not Verify - Red Outlined Button */}
            <Button 
              variant="outline"
              onClick={skipNoShow}
              className="w-full h-12 text-base font-medium border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Could Not Verify
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
