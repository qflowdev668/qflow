"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Mail, User } from "lucide-react"
import { useApp } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import { useChromeInsets } from "@/hooks/use-chrome-insets"
import { TopBar } from "@/components/qflow/top-bar"
import { UserAvatar } from "@/components/qflow/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch, formatApiErrorMessage } from "@/lib/api-client"
import { compressAvatarImage, validateAvatarFile } from "@/lib/avatar-upload"

export function EditProfileScreen() {
  const { currentUser, updateProfile, navigateTo, authError, clearAuthError } = useApp()
  const t = useT()
  const { paddingBottom } = useChromeInsets()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(currentUser?.name ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarSaved, setAvatarSaved] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const displayAvatarUrl = previewUrl ?? currentUser?.avatar ?? null

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

  const handlePickPhoto = () => {
    setAvatarError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !currentUser) return

    setAvatarError(null)
    setAvatarSaved(false)

    const validation = validateAvatarFile(file)
    if (validation === "too_large") {
      setAvatarError(t.avatarTooLarge)
      return
    }
    if (validation === "not_image") {
      setAvatarError(t.avatarInvalidType)
      return
    }

    const localPreview = URL.createObjectURL(file)
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(localPreview)

    setAvatarUploading(true)
    try {
      const blob = await compressAvatarImage(file)
      const form = new FormData()
      form.append("file", blob, "avatar.jpg")

      const res = await apiFetch("/api/user/avatar", {
        method: "POST",
        body: form,
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setAvatarError(formatApiErrorMessage(payload, t.avatarUploadFailed))
        return
      }
      const avatarUrl =
        payload && typeof payload === "object" && "avatarUrl" in payload
          ? String((payload as { avatarUrl: unknown }).avatarUrl)
          : null
      if (!avatarUrl) {
        setAvatarError(t.avatarUploadFailed)
        return
      }
      await updateProfile({ avatarUrl })
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setAvatarSaved(true)
    } catch {
      setAvatarError(t.avatarUploadFailed)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!currentUser) return
    setAvatarError(null)
    setAvatarSaved(false)
    setAvatarUploading(true)
    try {
      const res = await apiFetch("/api/user/avatar", { method: "DELETE" })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setAvatarError(formatApiErrorMessage(payload, t.avatarUploadFailed))
        return
      }
      await updateProfile({ avatarUrl: null })
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setAvatarSaved(true)
    } catch {
      setAvatarError(t.avatarUploadFailed)
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <TopBar title={t.editProfile} showBack backTo="profile" />

      <form
        onSubmit={handleSave}
        className="flex-1 space-y-4 overflow-auto px-6 py-6"
        style={{ paddingBottom }}
      >
        <p className="text-sm text-muted-foreground">{t.editProfileDesc}</p>

        <div className="flex flex-col items-center gap-2 py-2">
          <button
            type="button"
            onClick={handlePickPhoto}
            disabled={avatarUploading}
            className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t.changePhoto}
            data-testid="avatar-pick-button"
          >
            <UserAvatar
              name={name || currentUser?.name}
              avatarUrl={displayAvatarUrl}
              size="xl"
            >
              {avatarUploading && (
                <span
                  className="absolute inset-x-0 bottom-0 rounded-b-full bg-black/55 px-2 py-1 text-center text-[10px] font-semibold text-white"
                  data-testid="avatar-uploading"
                >
                  {t.saving}
                </span>
              )}
              {!avatarUploading && (
                <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow">
                  <Camera className="h-4 w-4" />
                </span>
              )}
            </UserAvatar>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            data-testid="avatar-file-input"
            onChange={(e) => void handleFileChange(e)}
          />
          {(displayAvatarUrl || currentUser?.avatar) && (
            <button
              type="button"
              onClick={() => void handleRemovePhoto()}
              disabled={avatarUploading}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              data-testid="avatar-remove"
            >
              {t.removePhoto}
            </button>
          )}
          {avatarError && (
            <p className="text-center text-sm text-destructive" role="alert" data-testid="avatar-error">
              {avatarError}
            </p>
          )}
          {avatarSaved && !avatarError && (
            <p className="text-center text-sm text-foreground" data-testid="avatar-saved">
              {t.avatarUpdated}
            </p>
          )}
        </div>

        {(authError || localError) && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {authError || localError}
          </div>
        )}

        {saved && (
          <div className="rounded-lg bg-primary/10 p-3 text-sm text-foreground">
            {t.profileSaved}
          </div>
        )}

        <div className="relative">
          <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.fullName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 pl-11"
            required
            autoComplete="name"
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            value={currentUser?.email ?? ""}
            className="h-12 bg-muted pl-11"
            disabled
            readOnly
          />
        </div>
        <p className="text-xs text-muted-foreground">{t.emailLockedHint}</p>

        <Button
          type="submit"
          className="h-12 w-full text-base font-semibold"
          disabled={
            isSaving ||
            name.trim() === (currentUser?.name ?? "") ||
            name.trim().length < 2
          }
          data-testid="edit-profile-save"
          title={
            name.trim() === (currentUser?.name ?? "")
              ? "Change your name to enable Save"
              : undefined
          }
        >
          {isSaving ? t.saving : t.save}
        </Button>
        {name.trim() === (currentUser?.name ?? "") && (
          <p
            className="text-center text-xs text-muted-foreground"
            data-testid="edit-profile-unchanged-hint"
          >
            Change your name to enable Save
          </p>
        )}
      </form>
    </div>
  )
}
