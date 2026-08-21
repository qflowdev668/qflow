"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

function QFlowLogo() {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-md">
        <svg viewBox="0 0 40 40" className="w-10 h-10 text-white" aria-hidden>
          <path
            fill="currentColor"
            d="M20 4C11.163 4 4 11.163 4 20s7.163 16 16 16 16-7.163 16-16S28.837 4 20 4zm0 28c-6.627 0-12-5.373-12-12S13.373 8 20 8s12 5.373 12 12-5.373 12-12 12z"
          />
          <path
            fill="currentColor"
            d="M20 12c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 12c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"
          />
          <circle fill="currentColor" cx="20" cy="20" r="2" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">QFlow</p>
    </div>
  )
}

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col items-center justify-center px-8 text-center">
      <QFlowLogo />
      <h1 className="text-xl font-semibold text-foreground mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-xs">
        We&apos;re sorry — please refresh or try again in a moment.
      </p>
      <Button
        className="h-12 px-8 font-semibold"
        onClick={() => {
          window.location.reload()
        }}
      >
        Refresh Page
      </Button>
    </div>
  )
}

function reportClientError(error: Error, errorInfo: ErrorInfo) {
  console.error("[QFlow ErrorBoundary]", error, errorInfo.componentStack)

  const payload = {
    message: error.message?.slice(0, 2000) || "Unknown error",
    name: error.name?.slice(0, 200) || "Error",
    stack: error.stack?.slice(0, 8000) ?? null,
    component_stack: errorInfo.componentStack?.slice(0, 8000) ?? null,
    path: typeof window !== "undefined" ? window.location.pathname : null,
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
  }

  void fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Monitoring must never break the fallback UI.
  })
}

/** Catches render errors in the client tree and shows a friendly recovery screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportClientError(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
