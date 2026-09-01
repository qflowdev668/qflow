"use client"

import { useCallback, useEffect, useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT, fmt } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, UserPlus, RefreshCw, Ban, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

type AdminAccount = {
  id: string
  name: string
  cellNumber: string
  email: string
  isActive: boolean
  isBootstrap: boolean
  lastLoginAt: string | null
  createdAt: string | null
}

function formatLastLogin(iso: string | null, neverLabel: string) {
  if (!iso) return neverLabel
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return neverLabel
  }
}

export function ManageAdminsScreen() {
  const { navigateTo } = useApp()
  const t = useT()

  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [cellNumber, setCellNumber] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadAdmins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/api/admin/admins")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not load admins.")
        setAdmins([])
        return
      }
      setAdmins(data.admins ?? [])
    } catch {
      setError("Could not load admins.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAdmins()
  }, [loadAdmins])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await apiFetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cellNumber, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not create admin.")
        return
      }
      setName("")
      setCellNumber("")
      setEmail("")
      showToast(t.adminCreated)
      await loadAdmins()
    } catch {
      setError("Could not create admin.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (admin: AdminAccount, isActive: boolean) => {
    if (admin.isBootstrap) return
    if (!isActive) {
      const ok = window.confirm(fmt(t.deactivateAdminConfirm, { name: admin.name }))
      if (!ok) return
    }

    setError(null)
    const res = await apiFetch("/api/admin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: admin.id, isActive }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Could not update admin.")
      return
    }
    showToast(t.adminUpdated)
    await loadAdmins()
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopBar
        title={t.manageAdmins}
        showBack
        onBack={() => navigateTo("admin-dashboard")}
      />

      <div className="px-4 py-6 space-y-6">
        <p className="text-sm text-muted-foreground">{t.manageAdminsSubtitle}</p>

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
            <h2 className="font-semibold text-foreground">{t.addAdmin}</h2>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.adminName}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.adminCell}</label>
            <Input
              type="tel"
              value={cellNumber}
              onChange={(e) => setCellNumber(e.target.value)}
              className="h-11"
              required
              placeholder="06XXXXXXXX"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t.adminEmail}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              required
              autoComplete="email"
            />
          </div>

          <Button type="submit" className="w-full h-12" disabled={submitting}>
            {submitting ? t.creatingAdmin : t.createAdminAccount}
          </Button>
        </form>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">{t.adminList}</h2>
            <button
              type="button"
              onClick={() => void loadAdmins()}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">...</p>
          ) : admins.length === 0 ? (
            <div className="bg-muted/40 rounded-2xl p-6 text-center text-sm text-muted-foreground">
              {t.noAdminsYet}
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="bg-card border border-border rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{admin.name}</p>
                        {admin.isBootstrap && (
                          <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {t.bootstrapAdminBadge}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full",
                            admin.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {admin.isActive ? t.adminActive : t.adminInactive}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                      <p className="text-sm text-muted-foreground">{admin.cellNumber}</p>
                    </div>
                    <Shield className="w-5 h-5 text-primary shrink-0" />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t.lastLogin}:{" "}
                    {formatLastLogin(admin.lastLoginAt, t.neverLoggedIn)}
                  </p>

                  {admin.isBootstrap ? (
                    <p className="text-xs text-muted-foreground">{t.bootstrapCannotRemove}</p>
                  ) : admin.isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 border-destructive text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => void handleToggleActive(admin, false)}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {t.deactivateAdmin}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10"
                      onClick={() => void handleToggleActive(admin, true)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t.reactivateAdmin}
                    </Button>
                  )}
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
