/** Initials from a display name (e.g. "Bongani Mathew Miya" → "BMM"). */
export function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return ""
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 3)
}
