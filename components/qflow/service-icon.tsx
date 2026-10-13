import { serviceIconSrc } from "@/lib/service-icons"
import { cn } from "@/lib/utils"
import type { Location } from "@/lib/app-context"

export function ServiceIcon({
  type,
  name,
  className,
}: {
  type: Location["type"]
  name?: string
  className?: string
}) {
  return (
    <img
      src={serviceIconSrc(type, name)}
      alt=""
      className={cn("object-contain", className)}
      data-testid={`service-icon-${type}`}
    />
  )
}
