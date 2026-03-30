"use client"

import { cn } from "@/lib/utils"
import type { QueueStatus } from "@/lib/app-context"

interface QueueStatusBadgeProps {
  status: QueueStatus
  className?: string
}

const statusConfig = {
  waiting: {
    label: "Waiting",
    className: "bg-amber-100 text-amber-700 border-amber-200"
  },
  almost: {
    label: "Almost Your Turn",
    className: "bg-blue-100 text-blue-700 border-blue-200"
  },
  "your-turn": {
    label: "Your Turn",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200"
  },
  served: {
    label: "Served",
    className: "bg-gray-100 text-gray-700 border-gray-200"
  }
}

export function QueueStatusBadge({ status, className }: QueueStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
      config.className,
      className
    )}>
      {status === "waiting" || status === "almost" ? (
        <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />
      ) : null}
      {config.label}
    </span>
  )
}
