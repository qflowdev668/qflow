"use client"

import { PrivateLoginGate } from "@/components/qflow/private-login-gate"
import { AdminPhoneOtpScreen } from "@/components/qflow/screens/admin-phone-otp-screen"

export default function Page() {
  return (
    <PrivateLoginGate kind="admin">
      <AdminPhoneOtpScreen />
    </PrivateLoginGate>
  )
}
