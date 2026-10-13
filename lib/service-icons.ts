import type { Location } from "@/lib/app-context"

export type ServiceIconKind = "clinic" | "hospital" | "bank" | "government" | "counter"

const HOSPITAL_NAME = /hospital|hospitaal|isibhedlela|sepetlele/i

/** Pick the service picture. A clinic named like a hospital uses the hospital icon. */
export function serviceIconKind(type: Location["type"], name?: string): ServiceIconKind {
  if (type === "clinic") {
    return name && HOSPITAL_NAME.test(name) ? "hospital" : "clinic"
  }
  if (type === "bank") return "bank"
  if (type === "government") return "government"
  return "counter"
}

export function serviceIconSrc(type: Location["type"], name?: string): string {
  return `/service-icons/${serviceIconKind(type, name)}.png`
}
