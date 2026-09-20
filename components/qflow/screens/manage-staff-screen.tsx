"use client"

import { useCallback, useEffect, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT, fmt } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  UserPlus,
  MapPin,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Ban,
  CheckCircle2,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isStrongPassword } from "@/lib/password"
import { PasswordRules } from "@/components/qflow/password-rules"
import { apiFetch } from "@/lib/api-client"

type StaffMember = {
  id: string
  name: string
  email: string
  locationId: string | null
  locationName: string | null
  createdAt?: string
  suspended?: boolean
}

type StaffPatchAction = "suspendStaff" | "deleteStaff" | "unsuspendStaff"

export function ManageStaffScreen() {
  const { locations, navigateTo } = useApp()
  const t = useT()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [locationId, setLocationId] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [manageTarget, setManageTarget] = useState<StaffMember | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [resetPassword, setResetPassword] = useState("")
  const [showResetPassword, setShowResetPassword] = useState(false)

  const loadStaff = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/api/admin/staff")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not load staff.")
        setStaff([])
        return
      }
      setStaff(data.staff ?? [])
    } catch {
      setError("Could not load staff.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStaff()
  }, [loadStaff])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isStrongPassword(password)) {
      setError(t.passwordTooWeak)
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          locationId: locationId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not create staff.")
        return
      }
      setName("")
      setEmail("")
      setPassword("")
      setLocationId("")
      showToast(t.staffCreated)
      await loadStaff()
    } catch {
      setError("Could not create staff.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReassign = async (id: string, nextLocationId: string) => {
    setError(null)
    const res = await apiFetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        locationId: nextLocationId || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Could not update staff.")
      return
    }
    showToast(t.staffUpdated)
    await loadStaff()
  }

  const resetStaffPassword = async (member: StaffMember) => {
    setError(null)
    if (!isStrongPassword(resetPassword)) {
      setError(t.passwordTooWeak)
      return
    }
    setActionLoading(true)
    try {
      const res = await apiFetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, password: resetPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not reset staff password.")
        return
      }
      setResetPassword("")
      setShowResetPassword(false)
      setManageTarget(null)
      showToast("Staff password updated — they can sign in now.")
    } catch {
      setError("Could not reset staff password.")
    } finally {
      setActionLoading(false)
    }
  }

  const patchStaff = async (member: StaffMember, action: StaffPatchAction) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, [action]: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not update staff.")
        return false
      }
      setManageTarget(null)
      if (action === "suspendStaff") showToast(t.staffSuspendedToast)
      else if (action === "unsuspendStaff") showToast(t.staffReactivatedToast)
      else showToast(t.staffDeletedToast)
      await loadStaff()
      return true
    } catch {
      setError("Could not update staff.")
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopBar
        title={t.manageStaff}
        showBack
        onBack={() => navigateTo("admin-dashboard")}
      />

      <div className="px-4 py-6 space-y-6">
        <p className="text-sm text-muted-foreground">{t.manageStaffSubtitle}</p>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="bg-card border border-border rounded-2xl p-4 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t.addStaffMember}</h2>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.staffName}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.staffEmail}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.staffPassword}</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-11"
                required
                minLength={12}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-2">
              <PasswordRules
                password={password}
                labels={{
                  passwordRuleLength: t.passwordRuleLength,
                  passwordRuleLower: t.passwordRuleLower,
                  passwordRuleUpper: t.passwordRuleUpper,
                  passwordRuleNumber: t.passwordRuleNumber,
                  passwordRuleSymbol: t.passwordRuleSymbol,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t.temporaryPasswordHint}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.assignLocation}</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t.noLocationYet}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            className="w-full h-12"
            disabled={submitting || !isStrongPassword(password)}
          >
            {submitting ? t.creatingStaff : t.createStaffAccount}
          </Button>
        </form>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">{t.staffList}</h2>
            <button
              type="button"
              onClick={() => void loadStaff()}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">...</p>
          ) : staff.length === 0 ? (
            <div className="bg-muted/40 rounded-2xl p-6 text-center text-sm text-muted-foreground">
              {t.noStaffYet}
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="bg-card border border-border rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{member.name}</p>
                        {member.suspended && (
                          <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {t.staffSuspended}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{member.locationName ?? t.unassigned}</span>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t.reassignLocation}
                    </label>
                    <select
                      value={member.locationId ?? ""}
                      onChange={(e) => void handleReassign(member.id, e.target.value)}
                      disabled={member.suspended}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                    >
                      <option value="">{t.noLocationYet}</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {member.suspended ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10"
                      onClick={() => void patchStaff(member, "unsuspendStaff")}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t.reactivateStaff}
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10"
                    onClick={() => setManageTarget(member)}
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    {t.manageStaffAccess}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full h-11"
          onClick={() => navigateTo("admin-dashboard")}
        >
          {t.backToAdmin}
        </Button>
      </div>

      {manageTarget && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => {
            if (!actionLoading) setManageTarget(null)
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="manage-staff-title"
            aria-describedby="manage-staff-desc"
            className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="manage-staff-title"
              className="text-lg font-bold text-foreground text-center mb-2"
            >
              {fmt(t.manageStaffAccessTitle, { name: manageTarget.name })}
            </h3>
            <p
              id="manage-staff-desc"
              className="text-sm text-muted-foreground text-center mb-6"
            >
              {t.manageStaffAccessDesc}
            </p>

            {!manageTarget.suspended && (
              <Button
                type="button"
                className="w-full h-[52px] bg-[#F59E0B] hover:bg-[#F59E0B]/90 mb-3 text-white"
                disabled={actionLoading}
                onClick={() => void patchStaff(manageTarget, "suspendStaff")}
              >
                <Ban className="w-4 h-4 mr-2" />
                {actionLoading ? "..." : t.suspendStaff}
              </Button>
            )}

            <div className="mb-3 rounded-xl border border-border p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Reset sign-in password</p>
              <div className="relative">
                <Input
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="New temporary password"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowResetPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordRules password={resetPassword} />
              <Button
                type="button"
                className="w-full"
                disabled={actionLoading || !resetPassword}
                onClick={() => void resetStaffPassword(manageTarget)}
              >
                Save new password
              </Button>
            </div>

            <Button
              type="button"
              className="w-full h-[52px] bg-[#EF4444] hover:bg-[#EF4444]/90 mb-3"
              disabled={actionLoading}
              onClick={() => void patchStaff(manageTarget, "deleteStaff")}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {actionLoading ? "..." : t.deleteStaffPermanently}
            </Button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setManageTarget(null)}
              className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2 text-sm"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-4 right-4 bg-[#10B981] text-white rounded-xl p-4 shadow-lg z-50 text-center font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
