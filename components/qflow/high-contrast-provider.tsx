"use client"

import { useApp } from "@/lib/app-context"
import { Moon } from "lucide-react"

export function HighContrastProvider({ children }: { children: React.ReactNode }) {
  const { accessibility, setAccessibility } = useApp()
  const highContrast = accessibility.highContrast

  const toggleHighContrast = () => {
    setAccessibility({
      ...accessibility,
      highContrast: !accessibility.highContrast
    })
  }

  return (
    <div className={highContrast ? "high-contrast-mode" : ""}>
      {/* High contrast CSS overrides */}
      {highContrast && (
        <style jsx global>{`
          .high-contrast-mode {
            --background: 0 0% 0% !important;
            --foreground: 0 0% 100% !important;
            --card: 0 0% 10% !important;
            --card-foreground: 0 0% 100% !important;
            --popover: 0 0% 10% !important;
            --popover-foreground: 0 0% 100% !important;
            --primary: 60 100% 50% !important;
            --primary-foreground: 0 0% 0% !important;
            --secondary: 0 0% 10% !important;
            --secondary-foreground: 0 0% 100% !important;
            --muted: 0 0% 15% !important;
            --muted-foreground: 0 0% 70% !important;
            --accent: 0 0% 15% !important;
            --accent-foreground: 0 0% 100% !important;
            --destructive: 0 84% 60% !important;
            --destructive-foreground: 0 0% 100% !important;
            --border: 0 0% 100% !important;
            --input: 0 0% 100% !important;
            --ring: 60 100% 50% !important;
          }
          
          .high-contrast-mode .bg-background {
            background-color: #000000 !important;
          }
          
          .high-contrast-mode .bg-card {
            background-color: #1a1a1a !important;
            border-color: #ffffff !important;
          }
          
          .high-contrast-mode .bg-primary {
            background-color: #FFFF00 !important;
            color: #000000 !important;
          }
          
          .high-contrast-mode .text-primary {
            color: #FFFF00 !important;
          }
          
          .high-contrast-mode .text-foreground,
          .high-contrast-mode .text-card-foreground {
            color: #ffffff !important;
          }
          
          .high-contrast-mode .text-muted-foreground {
            color: #b3b3b3 !important;
          }
          
          .high-contrast-mode .border-border {
            border-color: #ffffff !important;
          }
          
          .high-contrast-mode button[class*="bg-primary"] {
            background-color: #FFFF00 !important;
            color: #000000 !important;
          }
          
          .high-contrast-mode button[variant="outline"],
          .high-contrast-mode .border-2 {
            border-color: #ffffff !important;
          }
          
          .high-contrast-mode [class*="rounded-full"][class*="bg-"] {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          
          .high-contrast-mode header.bg-primary,
          .high-contrast-mode .bg-primary {
            background-color: #1a1a1a !important;
          }
          
          .high-contrast-mode header.bg-primary h1,
          .high-contrast-mode header.bg-primary p,
          .high-contrast-mode header .text-white {
            color: #ffffff !important;
          }
          
          .high-contrast-mode svg {
            color: #ffffff !important;
          }
          
          .high-contrast-mode .bg-muted {
            background-color: #1a1a1a !important;
          }
        `}</style>
      )}
      
      {children}

      {/* Global High Contrast Toggle - always visible when enabled */}
      {highContrast && (
        <button
          onClick={toggleHighContrast}
          className="fixed bottom-24 left-4 bg-[#1a1a1a] border border-white text-white text-xs px-3 py-2 rounded-full z-[100] flex items-center gap-1.5"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#ffffff', color: '#ffffff' }}
        >
          <Moon className="w-3 h-3" style={{ color: '#ffffff' }} />
          High Contrast: ON
        </button>
      )}
    </div>
  )
}
