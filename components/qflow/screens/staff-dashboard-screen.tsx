"use client"

import { useApp } from "@/lib/app-context"
import { StatsCard } from "@/components/qflow/stats-card"
import { Button } from "@/components/ui/button"
import { Users, Clock, CheckCircle2, Phone, LogOut, Coffee } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock queue data for staff view
const mockQueueItems = [
  { id: "1", position: 1, name: "Customer", waitDuration: 12 },
  { id: "2", position: 2, name: "Customer", waitDuration: 8 },
  { id: "3", position: 3, name: "Customer", waitDuration: 5 },
  { id: "4", position: 4, name: "Customer", waitDuration: 3 },
  { id: "5", position: 5, name: "Customer", waitDuration: 1 },
]

export function StaffDashboardScreen() {
  const { currentUser, logout, callNext, isOnBreak, toggleBreak } = useApp()

  const stats = {
    waiting: mockQueueItems.length,
    avgWait: 8,
    servedToday: 47
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Staff Dashboard</h1>
            <p className="text-white/80 text-sm">Hillbrow Clinic</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isOnBreak ? "bg-amber-400" : "bg-emerald-400"
          )} />
          <span className="text-white flex-1">
            {isOnBreak ? "On Break" : "Active"}
          </span>
          <button
            onClick={toggleBreak}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isOnBreak 
                ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                : "bg-amber-500 text-white hover:bg-amber-600"
            )}
          >
            {isOnBreak ? "Resume" : "Take Break"}
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatsCard 
            label="People Waiting" 
            value={stats.waiting}
            icon={Users}
            variant="primary"
          />
          <StatsCard 
            label="Avg Wait" 
            value={`${stats.avgWait}m`}
            icon={Clock}
            variant="warning"
          />
          <StatsCard 
            label="Served Today" 
            value={stats.servedToday}
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        {/* Queue List */}
        <div className="mb-24">
          <h2 className="text-lg font-semibold text-foreground mb-3">Queue</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {mockQueueItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between px-4 py-4",
                  index !== mockQueueItems.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-bold text-primary">#{item.position}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.name} #{item.position}</p>
                    <p className="text-sm text-muted-foreground">Waiting {item.waitDuration} min</p>
                  </div>
                </div>
                {index === 0 && (
                  <Button 
                    size="sm" 
                    onClick={callNext}
                    className="h-9"
                    disabled={isOnBreak}
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Call
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
        <Button 
          onClick={callNext}
          className="w-full h-14 text-base font-semibold"
          disabled={isOnBreak || mockQueueItems.length === 0}
        >
          <Phone className="w-5 h-5 mr-2" />
          Call Next Person
        </Button>
      </div>
    </div>
  )
}
