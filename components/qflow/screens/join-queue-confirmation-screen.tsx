"use client"

import { useApp, Location } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Users, CheckCircle2, Bell } from "lucide-react"

export function JoinQueueConfirmationScreen() {
  const { joinQueue, navigateTo } = useApp()
  
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

  const handleConfirm = () => {
    joinQueue(location)
  }

  const handleCancel = () => {
    navigateTo("location-detail")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar 
        title="Join Queue" 
        showBack 
        backTo="location-detail"
      />

      <div className="flex-1 px-4 py-6">
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
          className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/25"
        >
          Confirm & Join
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
