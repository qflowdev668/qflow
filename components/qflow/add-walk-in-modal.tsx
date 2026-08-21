"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Info, UserPlus, CheckCircle2, Ticket, Printer, Shield, Zap, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/app-context"
import { estimateWait } from "@/lib/supabase/helpers"
import { fmt, useT } from "@/hooks/use-t"

type PrioritySelection = "emergency" | "fast-track" | "standard"
type EmergencyCategory = "police" | "paramedic" | "firefighter" | "traffic" | "military" | null
type FastTrackCategory = "learner" | "pregnant" | "disability" | "elderly" | "infant" | "distress" | null

interface WalkInCustomer {
  name: string
  idNumber: string
  cellNumber: string
  priorityType: PrioritySelection
  emergencyCategory: EmergencyCategory
  fastTrackCategory: FastTrackCategory
  notes: string
}

interface AddWalkInModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCustomer: (customer: {
    name: string
    priorityType: PrioritySelection
    priorityCategory?: string
    notes?: string
  }) => void
}

const emergencyOptions = [
  { id: "police", label: "On-duty Police Officer" },
  { id: "paramedic", label: "On-duty Paramedic / EMS" },
  { id: "firefighter", label: "On-duty Firefighter" },
  { id: "traffic", label: "On-duty Traffic Officer" },
  { id: "military", label: "Military Personnel" },
] as const

const fastTrackOptions = [
  { id: "learner", label: "School Learner (in uniform)" },
  { id: "pregnant", label: "Pregnant Woman" },
  { id: "disability", label: "Person with Disability" },
  { id: "elderly", label: "Elderly (65+)" },
  { id: "infant", label: "Parent with Infant" },
  { id: "distress", label: "Visible Pain / Distress" },
] as const

export function AddWalkInModal({ isOpen, onClose, onAddCustomer }: AddWalkInModalProps) {
  const { locationQueue, staffLocationName } = useApp()
  const t = useT()
  const [step, setStep] = useState<"form" | "confirmation">("form")
  const [formData, setFormData] = useState<WalkInCustomer>({
    name: "",
    idNumber: "",
    cellNumber: "",
    priorityType: "standard",
    emergencyCategory: null,
    fastTrackCategory: null,
    notes: ""
  })
  const [assignedPosition, setAssignedPosition] = useState(1)
  const [estimatedWait, setEstimatedWait] = useState(0)

  const handleSelectEmergency = (id: EmergencyCategory) => {
    setFormData(prev => ({
      ...prev,
      priorityType: "emergency",
      emergencyCategory: id,
      fastTrackCategory: null
    }))
  }

  const handleSelectFastTrack = (id: FastTrackCategory) => {
    setFormData(prev => ({
      ...prev,
      priorityType: "fast-track",
      emergencyCategory: null,
      fastTrackCategory: id
    }))
  }

  const handleSelectStandard = () => {
    setFormData(prev => ({
      ...prev,
      priorityType: "standard",
      emergencyCategory: null,
      fastTrackCategory: null
    }))
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) return

    const everyoneWaiting = locationQueue
    const emergenciesAhead = everyoneWaiting.filter((w) => w.priorityType === "emergency").length
    const priorityAhead = everyoneWaiting.filter((w) => w.priorityType !== "standard").length
    const position =
      formData.priorityType === "emergency"
        ? emergenciesAhead + 1
        : formData.priorityType === "fast-track"
        ? priorityAhead + 1
        : everyoneWaiting.length + 1
    setAssignedPosition(position)
    setEstimatedWait(estimateWait(position - 1))

    onAddCustomer({
      name: formData.name,
      priorityType: formData.priorityType,
      priorityCategory:
        formData.priorityType === "standard" ? undefined : getPriorityLabel(),
      notes: formData.notes.trim() || undefined,
    })
    setStep("confirmation")
  }

  const handleAddAnother = () => {
    setFormData({
      name: "",
      idNumber: "",
      cellNumber: "",
      priorityType: "standard",
      emergencyCategory: null,
      fastTrackCategory: null,
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
      priorityType: "standard",
      emergencyCategory: null,
      fastTrackCategory: null,
      notes: ""
    })
    onClose()
  }

  const currentTime = new Date().toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: true 
  })

  const getPriorityLabel = () => {
    if (formData.priorityType === "emergency" && formData.emergencyCategory) {
      return emergencyOptions.find(o => o.id === formData.emergencyCategory)?.label || "Emergency"
    }
    if (formData.priorityType === "fast-track" && formData.fastTrackCategory) {
      return fastTrackOptions.find(o => o.id === formData.fastTrackCategory)?.label || "Fast-track"
    }
    return "Standard"
  }

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
                    <h2 className="text-xl font-bold text-foreground">{t.addWalkInCustomer}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t.forCustomersWithoutPhone}</p>
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
                    {t.walkInQueueInfo}
                  </p>
                </div>

                {/* Customer Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t.customerNameRequired} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder={t.fullNamePlaceholder}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-12 rounded-xl"
                  />
                </div>

                {/* Reference Number - Part C */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t.referenceNumberOptional}
                  </label>
                  <Input
                    placeholder={t.referenceNumberPlaceholder}
                    value={formData.idNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">{t.notStoredPermanently}</p>
                </div>

                {/* Cell Number — SMS updates are not wired up yet */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="walk-in-cell" className="text-sm font-medium text-muted-foreground">
                      {t.cellNumber}
                    </label>
                    <span className="text-[11px] font-medium uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {t.comingSoon}
                    </span>
                  </div>
                  <Input
                    id="walk-in-cell"
                    placeholder={t.smsUpdatesPlaceholder}
                    value=""
                    readOnly
                    disabled
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">{t.smsNotAvailableYet}</p>
                </div>

                {/* Priority Selection */}
                <div className="space-y-4">
                  {/* Emergency Priority */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#EF4444]" />
                      <label className="text-sm font-medium text-foreground">
                        {t.emergencyPriorityLabel}
                      </label>
                    </div>
                    <div className="space-y-2">
                      {emergencyOptions.map((option) => (
                        <label 
                          key={option.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                            formData.emergencyCategory === option.id 
                              ? "border-[#EF4444] bg-red-50" 
                              : "border-border hover:border-gray-300"
                          )}
                        >
                          <input
                            type="radio"
                            name="priority"
                            checked={formData.emergencyCategory === option.id}
                            onChange={() => handleSelectEmergency(option.id)}
                            className="sr-only"
                          />
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            formData.emergencyCategory === option.id 
                              ? "border-[#EF4444]" 
                              : "border-gray-300"
                          )}>
                            {formData.emergencyCategory === option.id && (
                              <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                            )}
                          </div>
                          <span className="text-sm text-foreground">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Fast-Track Priority */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#F59E0B]" />
                      <label className="text-sm font-medium text-foreground">
                        {t.fastTrackPriorityLabel}
                      </label>
                    </div>
                    <div className="space-y-2">
                      {fastTrackOptions.map((option) => (
                        <label 
                          key={option.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                            formData.fastTrackCategory === option.id 
                              ? "border-[#F59E0B] bg-amber-50" 
                              : "border-border hover:border-gray-300"
                          )}
                        >
                          <input
                            type="radio"
                            name="priority"
                            checked={formData.fastTrackCategory === option.id}
                            onChange={() => handleSelectFastTrack(option.id)}
                            className="sr-only"
                          />
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            formData.fastTrackCategory === option.id 
                              ? "border-[#F59E0B]" 
                              : "border-gray-300"
                          )}>
                            {formData.fastTrackCategory === option.id && (
                              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                            )}
                          </div>
                          <span className="text-sm text-foreground">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Standard Queue */}
                  <label 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      formData.priorityType === "standard" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-gray-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="priority"
                      checked={formData.priorityType === "standard"}
                      onChange={handleSelectStandard}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      formData.priorityType === "standard" 
                        ? "border-primary" 
                        : "border-gray-300"
                    )}>
                      {formData.priorityType === "standard" && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{t.noPriorityStandard}</span>
                  </label>

                  {/* Priority Info Banners */}
                  {formData.priorityType === "emergency" && (
                    <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">
                        {t.emergencySkipQueueInfo}
                      </p>
                    </div>
                  )}

                  {formData.priorityType === "fast-track" && (
                    <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        {t.fastTrackMoveAheadInfo}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t.staffNotes}
                  </label>
                  <textarea
                    placeholder={t.notesPlaceholder}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>

              {/* POPIA Data Notice - Part C */}
              <div className="px-4 pb-4">
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600 leading-relaxed">
                        <span className="font-medium">{t.dataNoticeTitle}</span> {t.dataNoticeText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="sticky bottom-0 bg-card px-4 py-4 border-t border-border space-y-3">
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.name.trim()}
                  className={cn(
                    "w-full h-14 text-base font-semibold rounded-xl",
                    formData.priorityType === "emergency" && "bg-[#EF4444] hover:bg-red-600",
                    formData.priorityType === "fast-track" && "bg-[#F59E0B] hover:bg-amber-600"
                  )}
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  {t.addToQueue}
                </Button>
                <button 
                  onClick={handleClose}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {t.cancel}
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
                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-xl mb-6",
                  formData.priorityType === "emergency" 
                    ? "bg-red-50 border border-red-200" 
                    : formData.priorityType === "fast-track"
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-emerald-50 border border-emerald-200"
                )}>
                  <CheckCircle2 className={cn(
                    "w-6 h-6 flex-shrink-0",
                    formData.priorityType === "emergency" 
                      ? "text-red-600" 
                      : formData.priorityType === "fast-track"
                      ? "text-amber-600"
                      : "text-emerald-600"
                  )} />
                  <p className={cn(
                    "text-sm font-medium",
                    formData.priorityType === "emergency" 
                      ? "text-red-800" 
                      : formData.priorityType === "fast-track"
                      ? "text-amber-800"
                      : "text-emerald-800"
                  )}>
                    {formData.priorityType === "emergency" 
                      ? t.emergencyAddedSuccess
                      : formData.priorityType === "fast-track"
                      ? t.fastTrackAddedSuccess
                      : t.customerAddedSuccess}
                  </p>
                </div>

                {/* Ticket Card */}
                <div className={cn(
                  "bg-card border-2 rounded-2xl p-6 shadow-lg mx-auto max-w-[300px]",
                  formData.priorityType === "emergency" 
                    ? "border-[#EF4444]" 
                    : formData.priorityType === "fast-track"
                    ? "border-[#F59E0B]"
                    : "border-border"
                )}>
                  {/* Ticket Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className={cn(
                      "w-5 h-5",
                      formData.priorityType === "emergency" 
                        ? "text-[#EF4444]" 
                        : formData.priorityType === "fast-track"
                        ? "text-[#F59E0B]"
                        : "text-primary"
                    )} />
                    <span className={cn(
                      "font-bold",
                      formData.priorityType === "emergency" 
                        ? "text-[#EF4444]" 
                        : formData.priorityType === "fast-track"
                        ? "text-[#F59E0B]"
                        : "text-primary"
                    )}>QFlow</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{staffLocationName ?? "QFlow location"}</p>
                  
                  <div className="border-t border-dashed border-border my-4" />
                  
                  {/* Customer Info */}
                  <p className="font-semibold text-foreground text-lg">{formData.name || "Customer"}</p>
                  <p className="text-sm text-muted-foreground mb-2">{t.walkInCustomerLabel}</p>
                  {formData.priorityType !== "standard" && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      formData.priorityType === "emergency" 
                        ? "bg-red-100 text-red-700" 
                        : "bg-amber-100 text-amber-700"
                    )}>
                      {formData.priorityType === "emergency" ? <Shield className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                      {getPriorityLabel()}
                    </span>
                  )}
                  
                  {/* Position Number */}
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      {formData.priorityType === "emergency" ? t.emergencyLabel : formData.priorityType === "fast-track" ? t.priorityLabelShort : t.positionLabel}
                    </p>
                    <p className={cn(
                      "text-6xl font-bold",
                      formData.priorityType === "emergency" 
                        ? "text-[#EF4444]" 
                        : formData.priorityType === "fast-track"
                        ? "text-[#F59E0B]"
                        : "text-primary"
                    )}>
                      #{formData.priorityType === "emergency" ? "P1" : formData.priorityType === "fast-track" ? `P${assignedPosition}` : assignedPosition}
                    </p>
                  </div>
                  
                  {/* Wait Info */}
                  <div className="flex justify-between text-sm mt-4 py-3 border-t border-dashed border-border">
                    <div>
                      <p className="text-muted-foreground">{t.estWaitLabel}</p>
                      <p className="font-medium text-foreground">
                        {formData.priorityType === "emergency" ? t.immediateWait : `~${estimatedWait} min`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">{t.joinedLabel}</p>
                      <p className="font-medium text-foreground">{currentTime}</p>
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="mt-4 pt-4 border-t border-dashed border-border">
                    <p className="text-xs text-center text-muted-foreground leading-relaxed">
                      {formData.priorityType === "emergency" 
                        ? t.emergencyTicketInstructions
                        : t.standardTicketInstructions}
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
                    {t.printTicket}
                  </Button>
                  <Button 
                    onClick={handleAddAnother}
                    className="w-full h-12 text-base font-medium rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    {t.addAnotherWalkIn}
                  </Button>
                </div>
                
                <button 
                  onClick={handleClose}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-4 mt-2"
                >
                  {t.close}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
