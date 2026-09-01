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
import { JoinQueuePanel } from "@/components/qflow/join-queue-panel"
import { MapPin } from "lucide-react"

type JoinQueueDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: Location | null
}

/** Bottom sheet: location + join. Two taps for a standard join; a third if they pick priority. */
export function JoinQueueDrawer({ open, onOpenChange, location }: JoinQueueDrawerProps) {
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
      <DrawerContent className="mx-auto w-full max-w-md max-h-[88vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-xl leading-tight">
            {loc?.name ?? t.noLocationSelected}
          </DrawerTitle>
          <DrawerDescription className="flex items-start gap-1.5 text-left">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{loc?.address ?? t.goBackPickLocation}</span>
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          <JoinQueuePanel
            location={loc}
            mode="join"
            onJoined={() => onOpenChange(false)}
            onViewQueue={() => onOpenChange(false)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
