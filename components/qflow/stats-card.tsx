"use client"

import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  className?: string
  variant?: "default" | "primary" | "success" | "warning"
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/10 border-primary/20",
  success: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20"
}

const iconStyles = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning"
}

export function StatsCard({ label, value, icon: Icon, className, variant = "default" }: StatsCardProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 rounded-xl border",
      variantStyles[variant],
      className
    )}>
      {Icon && <Icon className={cn("w-5 h-5 mb-2", iconStyles[variant])} />}
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  )
}
