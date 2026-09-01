"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { QFlowLogo } from "@/components/qflow/qflow-logo"
import { apiFetch } from "@/lib/api-client"

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

function QFlowErrorLogo() {
  return <QFlowLogo size="md" showWordmark className="mb-4" />
}

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col items-center justify-center px-8 text-center">
      <QFlowErrorLogo />
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

  void apiFetch("/api/errors", {
    public: true,
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
