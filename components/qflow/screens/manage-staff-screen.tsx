"use client"

import { useCallback, useEffect, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT, fmt } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, MapPin, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { isStrongPassword } from "@/lib/password"
import { PasswordRules } from "@/components/qflow/password-rules"

type StaffMember = {
  id: string
  name: string
  email: string
  locationId: string | null
  locationName: string | null
  createdAt?: string
}

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

  const loadStaff = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/staff")
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
      const res = await fetch("/api/admin/staff", {
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
    const res = await fetch("/api/admin/staff", {
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

  const handleRemove = async (member: StaffMember) => {
    const ok = window.confirm(
      fmt(t.removeStaffConfirm, { name: member.name })
    )
    if (!ok) return

    setError(null)
    const res = await fetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: member.id, removeStaff: true }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Could not remove staff.")
      return
    }
    showToast(t.staffUpdated)
    await loadStaff()
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
                  <div>
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
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
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
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
                    type="button"
                    variant="outline"
                    className="w-full h-10 border-destructive text-destructive hover:bg-destructive hover:text-white"
                    onClick={() => void handleRemove(member)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t.removeStaffRole}
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

      {toast && (
        <div className="fixed bottom-6 left-4 right-4 bg-[#10B981] text-white rounded-xl p-4 shadow-lg z-50 text-center font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
