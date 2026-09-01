import type { Metadata } from "next"
import { PublicStatusPage } from "@/components/qflow/screens/public-status-page"

export const metadata: Metadata = {
  title: "QFlow System Status",
  description: "Live health of QFlow app server, database, authentication, and push.",
  robots: { index: true, follow: true },
}

export default function StatusPage() {
  return <PublicStatusPage />
}
