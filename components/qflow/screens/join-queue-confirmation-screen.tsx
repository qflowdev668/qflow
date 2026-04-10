"use client"

import { useState } from "react"
import { useApp, Location } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Users, CheckCircle2, Bell, Shield, Siren, Flame, Car, Medal, Backpack, Baby, Accessibility, UserCircle, HeartPulse } from "lucide-react"
import { cn } from "@/lib/utils"

type PriorityCategory = 
  | "police" | "paramedic" | "firefighter" | "traffic" | "military"
  | "learner" | "pregnant" | "disability" | "elderly" | "infant" | "distress"
  | null

const emergencyCategories = [
  { id: "police", label: "Police", icon: Shield },
  { id: "paramedic", label: "Paramedic", icon: Siren },
  { id: "firefighter", label: "Firefighter", icon: Flame },
  { id: "traffic", label: "Traffic", icon: Car },
  { id: "military", label: "Military", icon: Medal },
] as const

const fastTrackCategories = [
  { id: "learner", label: "Learner", icon: Backpack },
  { id: "pregnant", label: "Pregnant", icon: UserCircle },
  { id: "disability", label: "Disability", icon: Accessibility },
  { id: "elderly", label: "Elderly", icon: UserCircle },
  { id: "infant", label: "With Infant", icon: Baby },
  { id: "distress", label: "In Pain/Distress", icon: HeartPulse },
] as const

export function JoinQueueConfirmationScreen() {
  const { joinQueue, navigateTo } = useApp()
  const [selectedPriority, setSelectedPriority] = useState<PriorityCategory>(null)
  
  // Get selected location from window
  const location: Location = (window as unknown as { selectedLocation: Location }).selectedLocation || {
    id: "1",
    name: "Hillbrow Clinic",
    type: "clinic",
    address: "123 Pretoria St, Hillbrow, Johannesburg",
    distance: "1.2 km",
    queueCount: 12,
    waitTime: 25,
    capacity: 50,
    isOpen: true,
    coordinates: { lat: -26.1868, lng: 28.0459 },
    description: "Public health clinic offering general healthcare services."
  }

  // Assigned position #13, estimated wait 30 min as specified
  const position = 13
  const estimatedWait = 30

  const isEmergency = selectedPriority && emergencyCategories.some(c => c.id === selectedPriority)
  const isFastTrack = selectedPriority && fastTrackCategories.some(c => c.id === selectedPriority)

  const handleConfirm = () => {
    // Store priority status
    (window as unknown as { queuePriority: PriorityCategory }).queuePriority = selectedPriority
    joinQueue(location)
  }

  const handleCancel = () => {
    navigateTo("location-detail")
  }

  const handleSelectPriority = (id: PriorityCategory) => {
    setSelectedPriority(selectedPriority === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar 
        title="Join Queue" 
        showBack 
        backTo="location-detail"
      />

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Location Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{location.name}</h2>
            <p className="text-sm text-muted-foreground">{location.address}</p>
          </div>
        </div>

        {/* Position Assignment Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
          <div className="bg-primary text-primary-foreground px-4 py-4 text-center">
            <p className="text-sm opacity-90 mb-1">Your Assigned Position</p>
            <p className="text-5xl font-bold">#{position}</p>
          </div>
          
          <div className="p-5 space-y-4">
            {/* Estimated Wait */}
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-muted-foreground">Estimated Wait</span>
              </div>
              <span className="text-xl font-bold text-foreground">{estimatedWait} min</span>
            </div>

            {/* People Ahead */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground">People Ahead</span>
              </div>
              <span className="text-xl font-bold text-foreground">{position - 1}</span>
            </div>
          </div>
        </div>

        {/* Priority Status Section */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-6">
          <h3 className="text-base font-semibold text-foreground mb-2">Priority Status</h3>
          <p className="text-sm text-muted-foreground mb-4">Do you qualify for priority service?</p>
          
          {/* Emergency Priority Chips (Red) */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Emergency Priority</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {emergencyCategories.map((category) => {
              const Icon = category.icon
              const isSelected = selectedPriority === category.id
              return (
                <button
                  key={category.id}
                  onClick={() => handleSelectPriority(category.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px]",
                    isSelected 
                      ? "bg-[#EF4444] border-[#EF4444] text-white" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                </button>
              )
            })}
          </div>

          {/* Fast-track Priority Chips (Amber) */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Fast-track Priority</p>
          <div className="flex flex-wrap gap-2">
            {fastTrackCategories.map((category) => {
              const Icon = category.icon
              const isSelected = selectedPriority === category.id
              return (
                <button
                  key={category.id}
                  onClick={() => handleSelectPriority(category.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px]",
                    isSelected 
                      ? "bg-[#F59E0B] border-[#F59E0B] text-white" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                </button>
              )
            })}
          </div>

          {/* Priority Info Banners */}
          {isEmergency && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EF4444] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-red-800 mb-1">Emergency Priority</p>
                  <p className="text-sm text-red-700 leading-relaxed">
                    As an on-duty emergency worker, you will be served immediately. Please show your official ID or badge to staff on arrival.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isFastTrack && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 mb-1">Priority Fast-Track</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    You will be moved to the front of the queue. Please show proof to staff on arrival (uniform, ID, or relevant docs).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Notes */}
        <div className="space-y-3 mb-6">
          <div className="bg-primary/5 rounded-xl p-4 flex gap-3">
            <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {"We'll send you notifications as the queue moves and alert you when it's almost your turn."}
            </p>
          </div>
          <div className="bg-success/5 rounded-xl p-4 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can leave the queue at any time from the My Queue screen.
            </p>
          </div>
        </div>
      </div>

      {/* Actions - Confirm & Join and Cancel buttons */}
      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        <Button 
          onClick={handleConfirm}
          className={cn(
            "w-full h-14 text-base font-semibold rounded-xl shadow-lg",
            isEmergency && "bg-[#EF4444] hover:bg-red-600 shadow-red-500/25",
            isFastTrack && "bg-[#F59E0B] hover:bg-amber-600 shadow-amber-500/25",
            !selectedPriority && "shadow-primary/25"
          )}
        >
          {isEmergency ? "Join as Emergency Priority" : isFastTrack ? "Join as Priority" : "Confirm & Join"}
        </Button>
        <Button 
          variant="outline"
          onClick={handleCancel}
          className="w-full h-12 text-base rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
