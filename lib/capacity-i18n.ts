import type { TranslationKeys } from "@/lib/i18n"
import type { Location } from "@/lib/app-context"

export function getCapacityInfo(t: TranslationKeys, queueCount: number, capacity: number) {
  const percentage = Math.min((queueCount / capacity) * 100, 100)

  if (percentage >= 100) {
    return {
      percentage: 100,
      color: "bg-red-500",
      textColor: "text-red-600",
      label: t.queueFull,
      pulsing: true,
      level: "full" as const,
    }
  }
  if (percentage >= 91) {
    return {
      percentage,
      color: "bg-red-500",
      textColor: "text-red-600",
      label: t.nearlyFull,
      pulsing: false,
      level: "high" as const,
    }
  }
  if (percentage >= 76) {
    return {
      percentage,
      color: "bg-orange-500",
      textColor: "text-orange-600",
      label: t.almostFull,
      pulsing: false,
      level: "high" as const,
    }
  }
  if (percentage >= 51) {
    return {
      percentage,
      color: "bg-amber-500",
      textColor: "text-amber-600",
      label: t.capacityModerate,
      pulsing: false,
      level: "medium" as const,
    }
  }
  return {
    percentage,
    color: "bg-green-500",
    textColor: "text-green-600",
    label: t.lowWait,
    pulsing: false,
    level: "low" as const,
  }
}

export function getMapPinCapacityInfo(t: TranslationKeys, queueCount: number, capacity: number) {
  const info = getCapacityInfo(t, queueCount, capacity)
  const colorMap = {
    full: "#EF4444",
    high: info.percentage >= 76 ? "#F97316" : "#F97316",
    medium: "#F59E0B",
    low: "#10B981",
  } as const
  const pinColor =
    info.level === "full"
      ? colorMap.full
      : info.percentage >= 76
        ? "#F97316"
        : info.percentage >= 51
          ? colorMap.medium
          : colorMap.low

  return {
    percentage: info.percentage,
    color: pinColor,
    pulsing: info.pulsing,
    label: info.label,
  }
}

export function getLocationTypeLabel(t: TranslationKeys, type: Location["type"]) {
  const labels = {
    clinic: t.categoryClinic,
    bank: t.categoryBank,
    government: t.categoryGovernment,
    other: t.categoryOther,
  }
  return labels[type]
}
