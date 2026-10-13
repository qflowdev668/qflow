"use client"

/** Friendly SVG scenes — visual cues for users who prefer pictures over text. */

import type { ReactNode } from "react"

type SceneProps = { className?: string }

function SceneWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      width="320"
      height="240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Person pointing at a map pin near a clinic building */
export function FindLocationScene({ className }: SceneProps) {
  return (
    <SceneWrap className={className}>
      <rect width="320" height="240" rx="24" fill="#EFF6FF" />
      <rect x="200" y="72" width="72" height="88" rx="12" fill="#1D4ED8" opacity="0.15" />
      <rect x="212" y="84" width="48" height="56" rx="8" fill="#1D4ED8" />
      <rect x="224" y="96" width="12" height="12" rx="2" fill="#BFDBFE" />
      <rect x="244" y="96" width="12" height="12" rx="2" fill="#BFDBFE" />
      <path d="M236 148 L236 168 L252 168 L252 148" fill="#1E40AF" />
      <circle cx="236" cy="56" r="22" fill="#FBBF24" />
      <ellipse cx="236" cy="100" rx="28" ry="36" fill="#1D4ED8" />
      <circle cx="236" cy="48" r="18" fill="#FDE68A" />
      <path d="M208 118 L188 98" stroke="#FDE68A" strokeWidth="10" strokeLinecap="round" />
      <circle cx="120" cy="100" r="28" fill="#1D4ED8" opacity="0.2" />
      <path
        d="M120 72 C120 72 120 52 120 44 C120 36 128 28 136 28 C144 28 152 36 152 44 C152 52 136 72 136 72 C136 72 128 80 120 72 Z"
        fill="#1D4ED8"
      />
      <circle cx="136" cy="40" r="8" fill="#FFFFFF" />
    </SceneWrap>
  )
}

/** Person on phone — joined queue remotely */
export function JoinRemotelyScene({ className }: SceneProps) {
  return (
    <SceneWrap className={className}>
      <rect width="320" height="240" rx="24" fill="#EFF6FF" />
      <rect x="108" y="48" width="104" height="168" rx="16" fill="#0A0F1A" />
      <rect x="116" y="60" width="88" height="140" rx="10" fill="#FFFFFF" />
      <rect x="128" y="88" width="64" height="40" rx="8" fill="#1D4ED8" opacity="0.12" />
      <text x="160" y="116" textAnchor="middle" fill="#1D4ED8" fontSize="22" fontWeight="700" fontFamily="system-ui,sans-serif">
        #042
      </text>
      <circle cx="160" cy="72" r="6" fill="#10B981" />
      <circle cx="88" cy="120" r="26" fill="#FBBF24" />
      <ellipse cx="88" cy="168" rx="32" ry="40" fill="#1D4ED8" />
      <circle cx="88" cy="108" r="20" fill="#FDE68A" />
      <path d="M56 148 L72 132" stroke="#FDE68A" strokeWidth="8" strokeLinecap="round" />
      <rect x="64" y="132" width="20" height="32" rx="6" fill="#0A0F1A" opacity="0.8" />
    </SceneWrap>
  )
}

/** Person walking to counter — ready to be served */
export function ArriveReadyScene({ className }: SceneProps) {
  return (
    <SceneWrap className={className}>
      <rect width="320" height="240" rx="24" fill="#ECFDF5" />
      <rect x="32" y="140" width="256" height="16" rx="4" fill="#D1D5DB" />
      <rect x="48" y="100" width="80" height="40" rx="8" fill="#1D4ED8" />
      <rect x="56" y="108" width="64" height="8" rx="2" fill="#BFDBFE" />
      <circle cx="200" cy="108" r="28" fill="#10B981" opacity="0.2" />
      <path d="M200 88 L200 76 L212 82 L200 88 Z" fill="#10B981" />
      <circle cx="148" cy="112" r="22" fill="#FBBF24" />
      <ellipse cx="168" cy="156" rx="24" ry="32" fill="#1D4ED8" />
      <circle cx="148" cy="100" r="18" fill="#FDE68A" />
      <path d="M176 128 L200 116" stroke="#FDE68A" strokeWidth="8" strokeLinecap="round" />
      <path d="M192 156 L208 140 L224 156" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </SceneWrap>
  )
}

/** Home welcome — wave + queue ticket */
export function WelcomeHomeScene({ className }: SceneProps) {
  return (
    <SceneWrap className={className}>
      <rect width="320" height="240" rx="24" fill="#EFF6FF" />
      <circle cx="160" cy="120" r="64" fill="#1D4ED8" opacity="0.08" />
      <circle cx="140" cy="100" r="28" fill="#FBBF24" />
      <ellipse cx="140" cy="148" rx="32" ry="40" fill="#1D4ED8" />
      <circle cx="140" cy="88" r="20" fill="#FDE68A" />
      <path d="M108 120 L88 100" stroke="#FDE68A" strokeWidth="10" strokeLinecap="round" />
      <rect x="196" y="88" width="72" height="96" rx="12" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="208" y="104" width="48" height="32" rx="6" fill="#1D4ED8" opacity="0.15" />
      <text x="232" y="126" textAnchor="middle" fill="#1D4ED8" fontSize="18" fontWeight="700" fontFamily="system-ui,sans-serif">
        Q
      </text>
      <circle cx="232" cy="168" r="12" fill="#10B981" />
      <path d="M228 168 L231 171 L237 165" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </SceneWrap>
  )
}

/** Empty queue — relaxed waiting */
export function EmptyQueueScene({ className }: SceneProps) {
  return (
    <SceneWrap className={className}>
      <rect width="320" height="240" rx="24" fill="#F9FAFB" />
      <rect x="100" y="80" width="120" height="100" rx="16" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
      <circle cx="160" cy="120" r="24" stroke="#D1D5DB" strokeWidth="4" strokeDasharray="8 8" fill="none" />
      <circle cx="148" cy="168" r="20" fill="#FBBF24" />
      <ellipse cx="148" cy="200" rx="24" ry="28" fill="#1D4ED8" />
      <circle cx="148" cy="160" r="16" fill="#FDE68A" />
      <path d="M132 188 C132 188 120 176 112 168" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
    </SceneWrap>
  )
}

/** Help / support — friendly assistant */
export function HelpSupportScene({ className }: SceneProps) {
  return (
    <SceneWrap className={className}>
      <rect width="320" height="240" rx="24" fill="#EFF6FF" />
      <circle cx="160" cy="88" r="32" fill="#1D4ED8" opacity="0.15" />
      <circle cx="160" cy="72" r="24" fill="#FBBF24" />
      <ellipse cx="160" cy="128" rx="36" ry="44" fill="#1D4ED8" />
      <circle cx="160" cy="60" r="18" fill="#FDE68A" />
      <rect x="80" y="160" width="160" height="48" rx="24" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
      <circle cx="108" cy="184" r="6" fill="#D1D5DB" />
      <circle cx="128" cy="184" r="6" fill="#D1D5DB" />
      <circle cx="148" cy="184" r="6" fill="#1D4ED8" />
    </SceneWrap>
  )
}
