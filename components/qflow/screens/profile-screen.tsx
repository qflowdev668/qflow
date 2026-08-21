"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { BottomNav } from "@/components/qflow/bottom-nav"
import { useSession } from "@/components/qflow/session-expiry-banner"
import { Button } from "@/components/ui/button"
import { 
  User, 
  Bell, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  X,
  Download,
  Trash2,
  UserX,
  Lock,
  Globe,
  Accessibility
} from "lucide-react"
import { languageOptions } from "@/lib/app-context"
import { cn } from "@/lib/utils"

export function ProfileScreen() {
  const {
    currentUser,
    logout,
    queueHistory,
    navigateTo,
    language,
    exportMyData,
    clearQueueHistory,
  } = useApp()
  const t = useT()
  const { sessionExpiresAt, refreshSession } = useSession()
  const [showSessionCard, setShowSessionCard] = useState(false)
  const [showRefreshedToast, setShowRefreshedToast] = useState(false)
  
  // POPIA data rights state - Part B
  const [showDeleteHistoryDialog, setShowDeleteHistoryDialog] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteHistory = async () => {
    await clearQueueHistory()
    setShowDeleteHistoryDialog(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return

    setIsDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch("/api/account/delete", { method: "POST" })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setDeleteError(body.error ?? t.deleteAccountError)
        return
      }
      setShowDeleteAccountDialog(false)
      await logout()
      navigateTo("splash")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatSessionExpiry = (date: Date | null) => {
    if (!date) return t.unknown
    return new Intl.DateTimeFormat("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date)
  }

  const handleRefreshSession = () => {
    refreshSession()
    setShowRefreshedToast(true)
    setTimeout(() => {
      setShowRefreshedToast(false)
      setShowSessionCard(false)
    }, 1500)
  }

  // Get current language display name
  const currentLanguageName = languageOptions.find(l => l.code === language)?.english || "English"

  const menuItems = [
    { 
      icon: Accessibility, 
      label: t.accessibility, 
      sublabel: t.accessibilitySublabel,
      onClick: () => navigateTo("accessibility-settings"), 
      rightContent: <ChevronRight className="w-5 h-5 text-muted-foreground" />
    },
    { icon: User, label: t.editProfile, onClick: () => navigateTo("edit-profile"), rightContent: null },
    { icon: Bell, label: t.notifications, onClick: () => navigateTo("notification-settings"), rightContent: null },
    { 
      icon: Globe, 
      label: t.selectLanguage, 
      onClick: () => navigateTo("language-selection"), 
      rightContent: (
        <span className="text-sm text-gray-500 flex items-center gap-1">
          {currentLanguageName}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </span>
      )
    },
    { 
      icon: Shield, 
      label: t.session, 
      onClick: () => setShowSessionCard(true), 
      rightContent: (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          {t.activeExpires} {formatSessionExpiry(sessionExpiresAt)}
        </span>
      )
    },
    { icon: HelpCircle, label: t.helpSupport, onClick: () => navigateTo("help-support"), rightContent: null },
  ]

  const statusLabels = {
    completed: t.statusCompleted,
    cancelled: t.statusCancelled,
    "no-show": t.statusNoShow
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date)
  }

  const statusIcons = {
    completed: <CheckCircle2 className="w-5 h-5 text-success" />,
    cancelled: <XCircle className="w-5 h-5 text-destructive" />,
    "no-show": <Clock className="w-5 h-5 text-muted-foreground" />
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary px-4 pt-8 pb-12">
        <h1 className="text-xl font-bold text-white mb-6">{t.navProfile}</h1>
        
        {/* Avatar & Info */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {currentUser?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || <User className="w-8 h-8" />}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{currentUser?.name ?? t.yourProfile}</h2>
            <p className="text-white/80 text-sm">{currentUser?.email ?? ""}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white capitalize">
              {currentUser?.role || "user"}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 -mt-4">
        {/* Menu Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                "w-full flex items-center justify-between px-4 py-4 hover:bg-muted transition-colors",
                index !== menuItems.length - 1 && "border-b border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <span className="font-medium text-foreground block">{item.label}</span>
                  {"sublabel" in item && item.sublabel && (
                    <span className="text-sm text-muted-foreground">{item.sublabel}</span>
                  )}
                </div>
              </div>
              {item.rightContent ? (
                item.rightContent
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>

        {/* My Data & Privacy Section - Part B */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {t.myDataPrivacy}
          </h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={exportMyData}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{t.downloadMyData}</p>
                  <p className="text-sm text-muted-foreground">{t.downloadMyDataDesc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            
            {/* Delete Queue History */}
            <button
              onClick={() => setShowDeleteHistoryDialog(true)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{t.deleteQueueHistory}</p>
                  <p className="text-sm text-muted-foreground">{t.deleteQueueHistoryDesc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            
            {/* Delete My Account */}
            <button
              onClick={() => setShowDeleteAccountDialog(true)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserX className="w-5 h-5 text-[#EF4444]" />
                <div className="text-left">
                  <p className="font-medium text-[#EF4444]">{t.deleteMyAccount}</p>
                  <p className="text-sm text-muted-foreground">{t.deleteMyAccountDesc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Queue History */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">{t.queueHistory}</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {queueHistory.length > 0 ? (
              queueHistory.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-4",
                    index !== queueHistory.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {statusIcons[item.status]}
                    <div>
                      <p className="font-medium text-foreground">{item.locationName}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    item.status === "completed" && "bg-success/10 text-success",
                    item.status === "cancelled" && "bg-destructive/10 text-destructive",
                    item.status === "no-show" && "bg-muted text-muted-foreground"
                  )}>
                    {statusLabels[item.status]}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                {t.noQueueHistory}
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-destructive/10 rounded-xl text-destructive font-medium hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {t.logout}
        </button>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground mt-6 mb-4">
          QFlow v1.0.0
        </p>
      </div>

      <BottomNav />

      {/* Delete History Confirmation Dialog - Part B */}
      {showDeleteHistoryDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t.deleteAllHistoryQuestion}</h3>
            <p className="text-muted-foreground mb-6">{t.cannotBeUndone}</p>
            <div className="flex gap-3">
              <Button 
                variant="destructive"
                onClick={handleDeleteHistory}
                className="flex-1 h-11"
              >
                {t.deleteHistory}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowDeleteHistoryDialog(false)}
                className="flex-1 h-11"
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Dialog - Part B */}
      {showDeleteAccountDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t.deleteYourAccount}</h3>
            <p className="text-muted-foreground mb-4">
              {t.permanentlyRemove}
            </p>
            <ul className="text-muted-foreground mb-4 space-y-1 pl-4">
              <li>{t.deleteListProfile}</li>
              <li>{t.deleteListHistory}</li>
              <li>{t.deleteListNotifications}</li>
            </ul>
            <p className="text-sm text-destructive font-medium mb-4">{t.cannotBeUndone}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t.typeDeleteToConfirm}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t.typeDeletePlaceholder}
                className="w-full h-11 px-4 border border-input rounded-lg bg-background"
              />
            </div>

            {deleteError && (
              <p className="text-sm text-destructive mb-4">{deleteError}</p>
            )}

            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
              className={cn(
                "w-full h-11 mb-3",
                (deleteConfirmText !== "DELETE" || isDeleting) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isDeleting ? t.deleting : t.permanentlyDeleteAccount}
            </Button>
            <button
              onClick={() => {
                setShowDeleteAccountDialog(false)
                setDeleteConfirmText("")
                setDeleteError(null)
              }}
              className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Session Info Card Modal */}
      {showSessionCard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{t.sessionInfo}</h3>
              <button 
                onClick={() => setShowSessionCard(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {showRefreshedToast ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[#10B981]">
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-medium">{t.sessionRefreshed}</span>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t.statusLabel}</span>
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      {t.active}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t.expires}</span>
                    <span className="font-medium text-foreground">
                      {t.todayAt} {formatSessionExpiry(sessionExpiresAt)}
                    </span>
                  </div>
                </div>

                <Button 
                  variant="outline"
                  onClick={handleRefreshSession}
                  className="w-full h-11 font-medium"
                >
                  {t.refreshSession}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
