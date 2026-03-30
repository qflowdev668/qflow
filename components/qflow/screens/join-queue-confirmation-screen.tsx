"use client"

import { useApp, Location } from "@/lib/app-context"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Users, CheckCircle2 } from "lucide-react"

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

  const position = location.queueCount + 1
  const estimatedWait = location.waitTime + 5

  const handleConfirm = () => {
    joinQueue(location)
  }

  const handleCancel = () => {
    navigateTo("location-detail")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar 
        title="Confirm Queue" 
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

        {/* Queue Summary Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
          <div className="bg-primary/5 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Queue Summary</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground">Your position</span>
              </div>
              <span className="text-2xl font-bold text-primary">#{position}</span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-muted-foreground">Estimated wait</span>
              </div>
              <span className="text-lg font-semibold text-foreground">~{estimatedWait} minutes</span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground">Location</span>
              </div>
              <span className="text-sm font-medium text-foreground text-right max-w-[150px]">{location.address}</span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-primary/5 rounded-xl p-4 flex gap-3 mb-6">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {"You'll receive real-time updates as the queue moves. We'll notify you when it's almost your turn so you can arrive on time."}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pb-8 space-y-3 border-t border-border bg-card">
        <Button 
          onClick={handleConfirm}
          className="w-full h-14 text-base font-semibold"
        >
          Confirm & Join Queue
        </Button>
        <button 
          onClick={handleCancel}
          className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
