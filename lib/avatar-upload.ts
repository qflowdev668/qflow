export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_MAX_EDGE = 512
export const AVATAR_BUCKET = "avatars"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"])

export type AvatarValidationError = "too_large" | "not_image"

export function validateAvatarFile(file: File): AvatarValidationError | null {
  if (!ALLOWED_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    return "not_image"
  }
  if (!file.type.startsWith("image/")) return "not_image"
  if (file.size > AVATAR_MAX_BYTES) return "too_large"
  return null
}

/** Resize to max edge and encode as JPEG for smaller uploads. */
export async function compressAvatarImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, AVATAR_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    throw new Error("Canvas unavailable")
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
  )
  if (!blob) throw new Error("Could not encode image")
  return blob
}

export function avatarObjectPath(userId: string): string {
  return `${userId}.jpg`
}

export function avatarPublicUrl(supabaseUrl: string, userId: string): string {
  const base = supabaseUrl.replace(/\/$/, "")
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${avatarObjectPath(userId)}`
}
