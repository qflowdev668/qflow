"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Info, UserPlus, CheckCircle2, Ticket, Printer } from "lucide-react"
import { cn } from "@/lib/utils"

interface WalkInCustomer {
  name: string
  idNumber: string
  cellNumber: string
  specialNeeds: {
    elderly: boolean
    disability: boolean
    priority: boolean
  }
  notes: string
}

interface AddWalkInModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCustomer: (customer: WalkInCustomer, position: number) => void
}

export function AddWalkInModal({ isOpen, onClose, onAddCustomer }: AddWalkInModalProps) {
  const [step, setStep] = useState<"form" | "confirmation">("form")
  const [formData, setFormData] = useState<WalkInCustomer>({
    name: "",
    idNumber: "",
    cellNumber: "",
    specialNeeds: {
      elderly: false,
      disability: false,
      priority: false
    },
    notes: ""
  })
  const [assignedPosition, setAssignedPosition] = useState(14)

  const handleSubmit = () => {
    if (!formData.name.trim()) return
    
    // Generate position (mock - would come from backend)
    const position = 14
    setAssignedPosition(position)
    onAddCustomer(formData, position)
    setStep("confirmation")
  }

  const handleAddAnother = () => {
    setFormData({
      name: "",
      idNumber: "",
      cellNumber: "",
      specialNeeds: { elderly: false, disability: false, priority: false },
      notes: ""
    })
    setStep("form")
  }

  const handleClose = () => {
    setStep("form")
    setFormData({
      name: "",
      idNumber: "",
      cellNumber: "",
      specialNeeds: { elderly: false, disability: false, priority: false },
      notes: ""
    })
    onClose()
  }

  const currentTime = new Date().toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: true 
  })

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />
      
      {/* Bottom Sheet Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto">
          {step === "form" ? (
            <>
              {/* Header */}
              <div className="sticky top-0 bg-card px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Add Walk-in Customer</h2>
                    <p className="text-sm text-muted-foreground mt-1">For customers without a smartphone</p>
                  </div>
                  <button 
                    onClick={handleClose}
                    className="p-2 -mr-2 -mt-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="px-4 py-4 space-y-5">
                {/* Info Banner */}
                <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Customer will be added to the queue and given a position ticket to wait with
                  </p>
                </div>

                {/* Customer Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Customer Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Full name or initials"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-12 rounded-xl"
                  />
                </div>

                {/* ID Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    ID / Reference Number
                  </label>
                  <Input
                    placeholder="ID number (optional)"
                    value={formData.idNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    className="h-12 rounded-xl"
                  />
                </div>

                {/* Cell Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Cell Number
                  </label>
                  <Input
                    placeholder="For SMS updates (optional)"
                    value={formData.cellNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, cellNumber: e.target.value }))}
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank if no phone</p>
                </div>

                {/* Special Needs */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Special Needs
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={formData.specialNeeds.elderly}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            specialNeeds: { ...prev.specialNeeds, elderly: !!checked } 
                          }))
                        }
                      />
                      <span className="text-sm text-foreground">Elderly / needs assistance</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={formData.specialNeeds.disability}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            specialNeeds: { ...prev.specialNeeds, disability: !!checked } 
                          }))
                        }
                      />
                      <span className="text-sm text-foreground">Disability accommodation</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={formData.specialNeeds.priority}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            specialNeeds: { ...prev.specialNeeds, priority: !!checked } 
                          }))
                        }
                      />
                      <span className="text-sm text-foreground">Priority (pregnant, infant, urgent)</span>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Staff Notes
                  </label>
                  <textarea
                    placeholder="Any additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="sticky bottom-0 bg-card px-4 py-4 border-t border-border space-y-3">
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.name.trim()}
                  className="w-full h-14 text-base font-semibold rounded-xl"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add to Queue
                </Button>
                <button 
                  onClick={handleClose}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation Header */}
              <div className="sticky top-0 bg-card px-4 pt-4 pb-3">
                <div className="flex justify-end">
                  <button 
                    onClick={handleClose}
                    className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Confirmation Content */}
              <div className="px-4 pb-6">
                {/* Success Banner */}
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-800">
                    Customer added to queue successfully
                  </p>
                </div>

                {/* Ticket Card */}
                <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-lg mx-auto max-w-[300px]">
                  {/* Ticket Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    <span className="font-bold text-primary">QFlow</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Hillbrow Clinic</p>
                  
                  <div className="border-t border-dashed border-border my-4" />
                  
                  {/* Customer Info */}
                  <p className="font-semibold text-foreground text-lg">{formData.name || "Thabo M."}</p>
                  <p className="text-sm text-muted-foreground mb-6">Walk-in Customer</p>
                  
                  {/* Position Number */}
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Position</p>
                    <p className="text-6xl font-bold text-primary">#{assignedPosition}</p>
                  </div>
                  
                  {/* Wait Info */}
                  <div className="flex justify-between text-sm mt-4 py-3 border-t border-dashed border-border">
                    <div>
                      <p className="text-muted-foreground">Est. Wait:</p>
                      <p className="font-medium text-foreground">~35 min</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Joined:</p>
                      <p className="font-medium text-foreground">{currentTime}</p>
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="mt-4 pt-4 border-t border-dashed border-border">
                    <p className="text-xs text-center text-muted-foreground leading-relaxed">
                      Wait nearby and listen for your number to be called at the counter.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  <Button 
                    variant="outline"
                    onClick={() => window.print()}
                    className="w-full h-12 text-base font-medium rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-white"
                  >
                    <Printer className="w-5 h-5 mr-2" />
                    Print Ticket
                  </Button>
                  <Button 
                    onClick={handleAddAnother}
                    className="w-full h-12 text-base font-medium rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Add Another Walk-in
                  </Button>
                </div>
                
                <button 
                  onClick={handleClose}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-4 mt-2"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
