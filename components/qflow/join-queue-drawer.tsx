"use client"

import { useEffect } from "react"
import { useApp, type Location } from "@/lib/app-context"
import { useT } from "@/hooks/use-t"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { AskQflowAssistant } from "@/components/qflow/ask-qflow-assistant"
import { JoinQueuePanel } from "@/components/qflow/join-queue-panel"
import { ServiceIcon } from "@/components/qflow/service-icon"
import { getLocationTypeLabel } from "@/lib/capacity-i18n"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const typeChip = {
  clinic: "bg-primary/10 text-primary",
  bank: "bg-secondary/10 text-secondary",
  government: "bg-success/10 text-success",
  other: "bg-muted text-foreground",
} as const

type JoinQueueDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: Location | null
  showDirections?: boolean
  onDirections?: () => void
  directionsBusy?: boolean
}

/** Bottom sheet: location + join. Two taps for a standard join; a third if they pick priority. */
export function JoinQueueDrawer({
  open,
  onOpenChange,
  location,
  showDirections = false,
  onDirections,
  directionsBusy = false,
}: JoinQueueDrawerProps) {
  const { selectedLocation, clearAuthError } = useApp()
  const t = useT()
  const loc = location ?? selectedLocation

  useEffect(() => {
    if (!open) return
    clearAuthError()
  }, [open, loc?.id, clearAuthError])

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
      repositionInputs={false}
    >
      <DrawerContent
        data-testid="join-queue-drawer"
        className={cn("mx-auto w-full max-w-qflow")}
      >
        <DrawerHeader className="shrink-0 items-center gap-3 px-5 pb-6 pt-3 text-center md:gap-3 md:text-center">
          {loc?.type ? (
            <div className="relative flex h-[5.75rem] w-[5.75rem] items-center justify-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.22),transparent_68%)]"
              />
              <span
                aria-hidden
                className="absolute inset-1 rounded-full border border-dashed border-[#22D3EE]/80 motion-reduce:animate-none animate-[spin_18s_linear_infinite]"
              />
              <span
                aria-hidden
                className="absolute inset-[14px] rounded-[1.35rem] bg-white shadow-[0_14px_32px_rgba(29,78,216,0.22)]"
              />
              <ServiceIcon
                type={loc.type}
                name={loc.name}
                className="relative z-10 h-16 w-16 drop-shadow-[0_8px_12px_rgba(29,78,216,0.25)]"
              />
            </div>
          ) : null}
          {loc?.type ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                typeChip[loc.type]
              )}
            >
              {getLocationTypeLabel(t, loc.type)}
            </span>
          ) : null}
          <DrawerTitle className="text-xl leading-snug">
            {loc?.name ?? t.noLocationSelected}
          </DrawerTitle>
          <DrawerDescription className="flex items-start justify-center gap-1.5 text-center">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loc?.address ?? t.goBackPickLocation}</span>
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
          <JoinQueuePanel
            location={loc}
            mode="join"
            showDirections={showDirections}
            directionsBusy={directionsBusy}
            onDirections={onDirections}
            onJoined={() => onOpenChange(false)}
            onViewQueue={() => onOpenChange(false)}
          />
        </div>
        <div className="max-h-[45vh] shrink-0 overflow-y-auto px-5 pb-6 pt-5">
          <AskQflowAssistant compact placeName={loc?.name} className="mb-0" />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
