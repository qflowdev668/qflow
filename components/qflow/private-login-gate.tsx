"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { loginHref } from "@/lib/auth-gate"
import { isPrivateUnlocked } from "@/lib/private-access"

export function PrivateLoginGate({
  kind,
  children,
}: {
  kind: "admin" | "staff"
  children: ReactNode
}) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (isPrivateUnlocked(kind)) {
      setAllowed(true)
      return
    }
    router.replace(loginHref())
  }, [kind, router])

  if (!allowed) return null
  return <>{children}</>
}
