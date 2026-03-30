"use client"

import { useApp } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, Users } from "lucide-react"

export function StaffServingScreen() {
  const { currentlyServing, completeService, skipNoShow, navigateTo } = useApp()

  if (!currentlyServing) {
    navigateTo("staff-dashboard")
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-success px-4 py-6">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="w-6 h-6 text-white" />
          <h1 className="text-xl font-bold text-white">Now Serving</h1>
        </div>
        <p className="text-white/80 text-sm">Please assist this customer</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8">
        {/* Ticket Display */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center mb-6">
          <p className="text-sm text-muted-foreground mb-4">Ticket Number</p>
          <div className="text-8xl font-bold text-primary mb-6">
            {currentlyServing.ticketNumber}
          </div>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span>Wait time: <strong className="text-foreground">{currentlyServing.waitTime} min</strong></span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <h3 className="font-semibold text-foreground mb-3">Customer Info</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Anonymous Customer</p>
              <p className="text-sm text-muted-foreground">ID: {currentlyServing.ticketNumber.replace("#", "CUST-")}</p>
            </div>
          </div>
        </div>

        {/* Next in Queue Preview */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-2">Next in queue</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center border border-border">
              <span className="font-semibold text-foreground">#2</span>
            </div>
            <span className="text-foreground">Customer #2</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        <Button 
          onClick={completeService}
          className="w-full h-14 text-base font-semibold bg-success hover:bg-success/90"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Complete Service
        </Button>
        <Button 
          variant="outline"
          onClick={skipNoShow}
          className="w-full h-12 text-base border-destructive text-destructive hover:bg-destructive hover:text-white"
        >
          <XCircle className="w-5 h-5 mr-2" />
          Skip / No Show
        </Button>
      </div>
    </div>
  )
}
