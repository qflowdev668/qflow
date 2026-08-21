"use client"

import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, User, AlertTriangle, Shield, Zap, ShieldCheck, X, Timer } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { fmt, useT } from "@/hooks/use-t"

// Verification proof requirements by priority category
const verificationProofs: { match: string; proof: string }[] = [
  { match: "police", proof: "Show official SAPS badge or ID" },
  { match: "paramedic", proof: "Show official EMS badge or ID" },
  { match: "ems", proof: "Show official EMS badge or ID" },
  { match: "fire", proof: "Show official fire service ID" },
  { match: "traffic", proof: "Show traffic department ID" },
  { match: "military", proof: "Show military ID or badge" },
  { match: "learner", proof: "Show school uniform or student card" },
  { match: "pregnant", proof: "Visual confirmation is sufficient" },
  { match: "elderly", proof: "Visual confirmation is sufficient" },
  { match: "disability", proof: "Visual confirmation is sufficient" },
  { match: "infant", proof: "Visual confirmation is sufficient" },
  { match: "pain", proof: "Visual confirmation is sufficient" },
  { match: "distress", proof: "Visual confirmation is sufficient" },
]

const proofFor = (category: string, fallback: string) =>
  verificationProofs.find((p) => category.toLowerCase().includes(p.match))?.proof ??
  fallback

export function StaffServingScreen() {
  const { currentlyServing, completeService, skipNoShow, demoteToStandard, navigateTo } = useApp()
  const t = useT()
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showToast, setShowToast] = useState(false)
  
  // No-show timer state
  const [customerArrived, setCustomerArrived] = useState(false)
  const [noShowCountdown, setNoShowCountdown] = useState(180) // 3 minutes in seconds
  const [showNoShowDialog, setShowNoShowDialog] = useState(false)

  const isEmergency = currentlyServing?.priorityType === "emergency"
  const isFastTrack = currentlyServing?.priorityType === "fast-track"
  const isPriorityCustomer = isEmergency || isFastTrack
  const isWalkInCustomer = !!currentlyServing?.isWalkIn

  const currentCategory = currentlyServing?.priorityCategory ?? ""
  const currentName = currentlyServing?.customerName ?? t.customerLabel

  // Timer for elapsed time (only runs after customer arrives)
  useEffect(() => {
    if (!customerArrived) return
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [customerArrived])

  // No-show countdown timer
  useEffect(() => {
    if (customerArrived || noShowCountdown <= 0) return
    const timer = setInterval(() => {
      setNoShowCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [customerArrived, noShowCountdown])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleMoveToStandard = () => {
    setShowMoveDialog(false)
    demoteToStandard()
  }

  const handleMarkNoShow = () => {
    setShowNoShowDialog(false)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
      skipNoShow()
    }, 3000)
  }

  const handleGiveMoreTime = () => {
    setNoShowCountdown(prev => prev + 120) // Add 2 minutes
    setShowNoShowDialog(false)
  }

  const handleCustomerArrived = () => {
    setCustomerArrived(true)
  }

  if (!currentlyServing) {
    navigateTo("staff-dashboard")
    return null
  }

  const ticketNumber = currentlyServing.ticketNumber
  const nextInQueue = currentlyServing.next

  const timerExpired = noShowCountdown <= 0
  const progressPercent = (noShowCountdown / 180) * 100

  // Show no-show timer if customer hasn't arrived yet
  if (!customerArrived && !isPriorityCustomer) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="px-4 py-6 bg-muted border-b border-border">
          <div className="flex items-center justify-center gap-3">
            <Timer className="w-7 h-7 text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">{t.waitingForCustomer}</h1>
          </div>
        </div>

        {/* No-Show Timer Card */}
        <div className="flex-1 px-4 py-8">
          <div className="bg-card rounded-2xl border border-border shadow-lg p-6 mb-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Timer className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t.waitingForCustomerToArrive}</p>
              </div>
              
              <p className="text-lg font-semibold text-foreground mb-1">{fmt(t.ticketLabel, { number: ticketNumber })}</p>
              <p className="text-sm text-muted-foreground">{currentName}</p>
            </div>

            {/* Large Countdown Display */}
            <div className={cn(
              "text-center mb-4",
              timerExpired && "animate-pulse"
            )}>
              <p className={cn(
                "text-7xl font-bold font-mono",
                timerExpired ? "text-[#EF4444]" : noShowCountdown <= 60 ? "text-[#EF4444]" : "text-[#EF4444]"
              )}>
                {formatTime(noShowCountdown)}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
              <div 
                className={cn(
                  "h-full transition-all duration-1000",
                  timerExpired ? "bg-[#EF4444]" : "bg-[#EF4444]"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {timerExpired && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-[#EF4444] font-semibold">
                  {t.timeExpiredCustomerNotArrived}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleCustomerArrived}
              className="w-full h-14 text-base font-semibold bg-success hover:bg-success/90 rounded-xl"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {t.customerArrivedBeginService}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setShowNoShowDialog(true)}
              className={cn(
                "w-full h-12 text-base font-medium border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl",
                timerExpired && "animate-pulse"
              )}
            >
              <XCircle className="w-5 h-5 mr-2" />
              {t.markAsNoShow}
            </Button>
          </div>
        </div>

        {/* No-Show Confirmation Dialog */}
        {showNoShowDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">{t.markAsNoShow}</h3>
                <button 
                  onClick={() => setShowNoShowDialog(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              <p className="text-muted-foreground mb-4">
                {fmt(t.markAsNoShowQuestion, { name: currentName })}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {t.removedFromQueueHint}
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleMarkNoShow}
                  className="w-full h-12 bg-destructive hover:bg-destructive/90"
                >
                  {t.confirmNoShow}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleGiveMoreTime}
                  className="w-full h-12"
                >
                  {t.giveMoreTimeTwoMin}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {showToast && (
          <div className="fixed bottom-4 left-4 right-4 bg-foreground text-background px-4 py-3 rounded-xl shadow-lg">
            <p className="text-sm font-medium text-center">{t.customerMarkedNoShow}</p>
          </div>
        )}
      </div>
    )
  }

  // Show verification card if priority customer and not yet verified
  if (isPriorityCustomer && !isVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="px-4 py-6 bg-muted border-b border-border">
          <div className="flex items-center justify-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#F59E0B]" />
            <h1 className="text-xl font-bold text-foreground">{t.priorityVerification}</h1>
          </div>
        </div>

        {/* Verification Card */}
        <div className="flex-1 px-4 py-8">
          <div className="bg-card rounded-2xl border border-amber-200 shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{t.priorityVerificationRequired}</h2>
                <p className="text-sm text-muted-foreground">{t.verifyBeforeServing}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-muted rounded-xl p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">{t.customerLabel}</p>
              <p className="font-semibold text-foreground text-lg">{currentName}</p>
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mt-2",
                isEmergency ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              )}>
                {isEmergency ? <Shield className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                {currentCategory}
              </div>
            </div>

            {/* Accepted Proof */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">{t.acceptedProof}</p>
              <p className="text-sm text-blue-700">
                {proofFor(currentCategory, t.showRelevantId)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => setIsVerified(true)}
              className="w-full h-14 text-base font-semibold bg-success hover:bg-success/90 rounded-xl"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {t.verifiedProceedToServe}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setShowMoveDialog(true)}
              className="w-full h-12 text-base font-medium border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl"
            >
              <XCircle className="w-5 h-5 mr-2" />
              {t.couldNotVerifyMoveStandard}
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showMoveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">{t.moveToStandardQueue}</h3>
                <button 
                  onClick={() => setShowMoveDialog(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <p className="text-muted-foreground mb-6">
                {fmt(t.moveToStandardConfirm, { name: currentName })}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={handleMoveToStandard}
                  className="w-full h-12 bg-destructive hover:bg-destructive/90"
                >
                  {t.yesMoveThem}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowMoveDialog(false)}
                  className="w-full h-12"
                >
                  {t.cancel}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {showToast && (
          <div className="fixed bottom-4 left-4 right-4 bg-foreground text-background px-4 py-3 rounded-xl shadow-lg">
            <p className="text-sm font-medium text-center">{t.customerMovedToStandard}</p>
          </div>
        )}
      </div>
    )
  }

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
                <h1 className="text-xl font-bold text-white">{t.emergencyPriority}</h1>
                <p className="text-white/90 text-sm">{t.serveImmediately}</p>
              </div>
            </>
          ) : isFastTrack ? (
            <>
              <Zap className="w-7 h-7 text-white" />
              <h1 className="text-2xl font-bold text-white">{t.priorityFastTrack}</h1>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-7 h-7 text-white" />
              <h1 className="text-2xl font-bold text-white">{t.nowServing}</h1>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8">
        {/* Emergency Priority Display */}
        {isEmergency && (
          <div className="bg-card rounded-2xl border-2 border-[#EF4444] shadow-lg p-6 text-center mb-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">{t.emergencyPersonnel}</p>
            <p className="text-2xl font-bold text-foreground mb-1">{currentName}</p>
            <p className="text-sm text-muted-foreground mb-4">{fmt(t.ticketLabel, { number: ticketNumber })}</p>

            {currentCategory && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full mb-4">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">{currentCategory}</span>
              </div>
            )}
            
            {/* Elapsed Time */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span>{t.elapsedLabel}</span>
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
                <p className="font-semibold text-red-800 mb-2">{t.emergencyCustomerWarning}</p>
                <p className="text-sm text-red-700 leading-relaxed">
                  {t.emergencyVerifyIdHint}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fast-Track Priority Display */}
        {isFastTrack && (
          <>
            <div className="bg-card rounded-2xl border border-border shadow-lg p-8 text-center mb-6">
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-3">{t.ticketNumberLabel}</p>
              <div className="text-8xl font-bold text-[#F59E0B] mb-4">
                {ticketNumber}
              </div>
              
              <p className="text-lg font-semibold text-foreground mb-1">{currentName}</p>
              {currentCategory && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full mb-4">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">{currentCategory}</span>
                </div>
              )}
              
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
                  <p className="font-semibold text-amber-800 mb-1">{t.fastTrackCustomerNotice}</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    {t.verifyBeforeCompleting}
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
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-3">{t.ticketNumberLabel}</p>
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
                    <p className="font-semibold text-amber-800 mb-2">{t.walkInCustomer}</p>
                    <div className="space-y-1 text-sm text-amber-700">
                      <p><span className="text-amber-600">{t.nameLabel}</span> {currentName}</p>
                      {currentCategory && (
                        <p><span className="text-amber-600">{t.priorityLabel}</span> {currentCategory}</p>
                      )}
                    </div>
                    <p className="text-sm text-amber-700 mt-3 leading-relaxed">
                      {fmt(t.walkInCallByName, { number: String(ticketNumber) })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Next in Queue Preview Card */}
        <div className="bg-muted/50 rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">{t.nextInQueue}</p>
          {nextInQueue ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center border-2 border-border">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">{nextInQueue.ticketNumber}</p>
                <p className="text-sm text-muted-foreground">Waiting: {nextInQueue.waitTime} min</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noOneElseWaiting}</p>
          )}
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
              {t.serviceComplete}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setShowMoveDialog(true)}
              className="w-full h-12 text-base font-medium border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              {t.couldNotVerify}
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
              {t.completeService}
            </Button>
            
            <Button 
              variant="outline"
              onClick={skipNoShow}
              className="w-full h-12 text-base font-medium border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-xl"
            >
              <XCircle className="w-5 h-5 mr-2" />
              {t.skipNoShow}
            </Button>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Move to Standard Queue?</h3>
              <button 
                onClick={() => setShowMoveDialog(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground mb-6">
              Move {currentName} to the bottom of the standard queue? This cannot be undone.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleMoveToStandard}
                className="w-full h-12 bg-destructive hover:bg-destructive/90"
              >
                Yes, Move Them
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowMoveDialog(false)}
                className="w-full h-12"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 left-4 right-4 bg-foreground text-background px-4 py-3 rounded-xl shadow-lg">
          <p className="text-sm font-medium text-center">Customer moved to standard queue</p>
        </div>
      )}
    </div>
  )
}
