"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { StatsCard } from "@/components/qflow/stats-card"
import { AddWalkInModal } from "@/components/qflow/add-walk-in-modal"
import { Button } from "@/components/ui/button"
import { Users, Clock, CheckCircle2, Phone, LogOut, UserPlus, Star, Zap, Shield, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type PriorityType = "emergency" | "fast-track" | "standard"

interface QueueItem {
  id: string
  position: number
  name: string
  waitDuration: number
  isWalkIn?: boolean
  hasSpecialNeeds?: boolean
  priorityType: PriorityType
  priorityCategory?: string
}

// Mock queue data for staff view - includes priority customers
const initialPriorityQueue: QueueItem[] = [
  { id: "p1", position: 1, name: "Sgt. Dlamini", waitDuration: 0, priorityType: "emergency", priorityCategory: "Police" },
  { id: "p2", position: 2, name: "Learner", waitDuration: 2, priorityType: "fast-track", priorityCategory: "Learner" },
  { id: "p3", position: 3, name: "Thabo M.", waitDuration: 5, isWalkIn: true, hasSpecialNeeds: true, priorityType: "fast-track", priorityCategory: "Elderly" },
]

const initialStandardQueue: QueueItem[] = [
  { id: "1", position: 1, name: "Customer", waitDuration: 12, priorityType: "standard" },
  { id: "2", position: 2, name: "Customer", waitDuration: 8, isWalkIn: true, priorityType: "standard" },
  { id: "3", position: 3, name: "Customer", waitDuration: 5, priorityType: "standard" },
  { id: "4", position: 4, name: "Customer", waitDuration: 3, priorityType: "standard" },
  { id: "5", position: 5, name: "Customer", waitDuration: 1, priorityType: "standard" },
]

export function StaffDashboardScreen() {
  const { logout, callNext, isOnBreak, toggleBreak } = useApp()
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false)
  const [priorityQueue, setPriorityQueue] = useState<QueueItem[]>(initialPriorityQueue)
  const [standardQueue, setStandardQueue] = useState<QueueItem[]>(initialStandardQueue)

  const totalWaiting = priorityQueue.length + standardQueue.length
  const priorityCount = priorityQueue.length

  const stats = {
    waiting: totalWaiting,
    avgWait: 8,
    servedToday: 47,
    priorityNow: priorityCount
  }

  const handleAddWalkIn = (customer: { name: string; specialNeeds: { elderly: boolean; disability: boolean; priority: boolean } }, position: number) => {
    const hasPriority = customer.specialNeeds.elderly || customer.specialNeeds.disability || customer.specialNeeds.priority
    const newItem: QueueItem = {
      id: Date.now().toString(),
      position: hasPriority ? priorityQueue.length + 1 : standardQueue.length + 1,
      name: customer.name,
      waitDuration: 0,
      isWalkIn: true,
      hasSpecialNeeds: hasPriority,
      priorityType: hasPriority ? "fast-track" : "standard",
      priorityCategory: customer.specialNeeds.elderly ? "Elderly" : customer.specialNeeds.disability ? "Disability" : customer.specialNeeds.priority ? "Priority" : undefined
    }
    
    if (hasPriority) {
      setPriorityQueue(prev => [...prev, newItem])
    } else {
      setStandardQueue(prev => [...prev, newItem])
    }
  }

  const handleServeNow = (id: string) => {
    // Remove from priority queue and call next
    setPriorityQueue(prev => prev.filter(item => item.id !== id))
    callNext()
  }

  const handleCallStandard = (id: string) => {
    setStandardQueue(prev => prev.filter(item => item.id !== id))
    callNext()
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
        <div className="grid grid-cols-4 gap-2 mb-6">
          <StatsCard 
            label="Waiting" 
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
            label="Served" 
            value={stats.servedToday}
            icon={CheckCircle2}
            variant="success"
          />
          {/* Priority Now - Red Card */}
          <div className="bg-[#EF4444] rounded-xl p-3 text-white">
            <Zap className="w-5 h-5 mb-1" />
            <p className="text-2xl font-bold">{stats.priorityNow}</p>
            <p className="text-xs text-white/80">Priority</p>
          </div>
        </div>

        {/* Priority Queue Section */}
        {priorityQueue.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-[#EF4444]" />
              <h2 className="text-lg font-semibold text-foreground">Priority Queue</h2>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {priorityQueue.map((item, index) => {
                const isEmergency = item.priorityType === "emergency"
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-4 border-l-4",
                      isEmergency ? "border-l-[#EF4444]" : "border-l-[#F59E0B]",
                      index !== priorityQueue.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                        isEmergency ? "bg-[#EF4444]" : "bg-[#F59E0B]"
                      )}>
                        #P{item.position}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{item.name}</p>
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full",
                            isEmergency ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {item.priorityCategory}
                          </span>
                          {item.isWalkIn && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                              Walk-in
                            </span>
                          )}
                          {item.hasSpecialNeeds && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.waitDuration === 0 ? "Just joined" : `${item.waitDuration} min ago`}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleServeNow(item.id)}
                      className={cn(
                        "h-9",
                        isEmergency ? "bg-[#EF4444] hover:bg-red-600" : ""
                      )}
                      disabled={isOnBreak}
                    >
                      {isEmergency ? (
                        <>
                          <Shield className="w-4 h-4 mr-1" />
                          Serve Now
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Priority Rules Info */}
        <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-6">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Emergency workers are served immediately. Fast-track customers are served before standard queue members.
          </p>
        </div>

        {/* Standard Queue Section */}
        <div className="mb-32">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Standard Queue</h2>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {standardQueue.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between px-4 py-4",
                  index !== standardQueue.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-bold text-primary">#{item.position}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.isWalkIn && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                          Walk-in
                        </span>
                      )}
                      {item.hasSpecialNeeds && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Waiting {item.waitDuration} min</p>
                  </div>
                </div>
                {index === 0 && priorityQueue.length === 0 && (
                  <Button 
                    size="sm" 
                    onClick={() => handleCallStandard(item.id)}
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

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border space-y-3">
        <Button 
          onClick={callNext}
          className="w-full h-14 text-base font-semibold"
          disabled={isOnBreak || (priorityQueue.length === 0 && standardQueue.length === 0)}
        >
          <Phone className="w-5 h-5 mr-2" />
          Call Next Person
        </Button>
        <Button 
          variant="outline"
          onClick={() => setIsWalkInModalOpen(true)}
          className="w-full h-12 text-base font-medium border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Add Walk-in Customer
        </Button>
      </div>

      {/* Walk-in Modal */}
      <AddWalkInModal 
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onAddCustomer={handleAddWalkIn}
      />
    </div>
  )
}
