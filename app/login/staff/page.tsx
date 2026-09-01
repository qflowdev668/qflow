"use client"

import { PrivateLoginGate } from "@/components/qflow/private-login-gate"
import { StaffLoginScreen } from "@/components/qflow/screens/staff-login-screen"

export default function Page() {
  return (
    <PrivateLoginGate kind="staff">
      <StaffLoginScreen />
    </PrivateLoginGate>
  )
}
