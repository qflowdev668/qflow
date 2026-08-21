"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { TopBar } from "@/components/qflow/top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, User } from "lucide-react"

export function EditProfileScreen() {
  const { currentUser, updateProfile, navigateTo, authError, clearAuthError } = useApp()
  const t = useT()
  const [name, setName] = useState(currentUser?.name ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setLocalError(null)
    setSaved(false)

    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setLocalError(t.profileNameTooShort)
      return
    }

    setIsSaving(true)
    const ok = await updateProfile({ name: trimmed })
    setIsSaving(false)

    if (ok) {
      setSaved(true)
      setTimeout(() => navigateTo("profile"), 700)
    }
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar title={t.editProfile} showBack backTo="profile" />

      <form onSubmit={handleSave} className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        <p className="text-sm text-muted-foreground">{t.editProfileDesc}</p>

        {(authError || localError) && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {authError || localError}
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-lg bg-primary/10 text-foreground text-sm">
            {t.profileSaved}
          </div>
        )}

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.fullName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-11 h-12"
            required
            autoComplete="name"
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            value={currentUser?.email ?? ""}
            className="pl-11 h-12 bg-muted"
            disabled
            readOnly
          />
        </div>
        <p className="text-xs text-muted-foreground">{t.emailLockedHint}</p>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isSaving || name.trim() === (currentUser?.name ?? "")}
        >
          {isSaving ? t.saving : t.save}
        </Button>
      </form>
    </div>
  )
}
