import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ConditionalAppShell } from "@/components/qflow/conditional-app-shell"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "QFlow - Smart Queue Management",
  description:
    "Skip the line. Not the service. Join queues remotely at clinics, banks, and government offices.",
  generator: "v0.app",
  manifest: "/manifest.json",
  applicationName: "QFlow",
  appleWebApp: {
    capable: true,
    title: "QFlow",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "48x48", type: "image/x-icon" },
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png?v=2", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon-180.png?v=2", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    images: [
      {
        url: "https://useqflow.app/og-share-1200x630.png?v=2",
        width: 1200,
        height: 630,
        alt: "QFlow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "https://useqflow.app/og-share-1200x630.png?v=2",
        width: 1200,
        height: 630,
        alt: "QFlow",
      },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1A3FD6",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="48x48" />
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16.png?v=2" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180.png?v=2" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ConditionalAppShell>{children}</ConditionalAppShell>
        <Analytics />
      </body>
    </html>
  )
}
