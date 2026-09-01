"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"

type ComponentStatus = {
  name: string
  status: "operational" | "degraded" | "down"
  detail?: string
}

type StatusPayload = {
  overall: "operational" | "partial_outage" | "major_outage"
  overallLabel: string
  components: ComponentStatus[]
  checkedAt: string
}

const STATUS_LABEL: Record<ComponentStatus["status"], string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
}

const DOT: Record<ComponentStatus["status"] | "unknown", string> = {
  operational: "bg-[#10B981]",
  degraded: "bg-[#F59E0B]",
  down: "bg-[#EF4444]",
  unknown: "bg-muted-foreground",
}

/**
 * Public status page — no AppProvider / auth required.
 * Safe to open when the main app is failing.
 */
export function PublicStatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/api/status", { public: true, cache: "no-store" })
      if (!res.ok) {
        throw new Error(`Status API returned ${res.status}`)
      }
      const json = (await res.json()) as StatusPayload
      setData(json)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : "Could not load status.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const overallStatus: ComponentStatus["status"] | "unknown" = !data
    ? error
      ? "down"
      : "unknown"
    : data.overall === "operational"
      ? "operational"
      : data.overall === "partial_outage"
        ? "degraded"
        : "down"

  const checkedLabel = data?.checkedAt
    ? new Date(data.checkedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : "—"

  return (
    <div className="min-h-screen bg-white text-foreground">
      <div className="mx-auto max-w-lg px-5 py-10 sm:py-14">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-wide text-[#2563EB]">QFlow</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            System Status
          </h1>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-3 w-3 rounded-full ${DOT[overallStatus]} ${
                loading ? "animate-pulse" : ""
              }`}
              aria-hidden
            />
            <div>
              <p className="text-sm text-muted-foreground">Overall</p>
              <p className="text-lg font-semibold">
                {loading && !data
                  ? "Checking…"
                  : error
                    ? "Unable to reach status API"
                    : data?.overallLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Components
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {(data?.components ??
              [
                { name: "App Server", status: "operational" as const, detail: undefined },
                { name: "Database", status: "operational" as const, detail: undefined },
                { name: "Authentication", status: "operational" as const, detail: undefined },
                {
                  name: "Push Notifications",
                  status: "operational" as const,
                  detail: undefined,
                },
              ]
            ).map((row) => {
              const status: ComponentStatus["status"] | "unknown" = data
                ? row.status
                : loading
                  ? "unknown"
                  : "unknown"
              const label =
                !data && loading
                  ? "Checking…"
                  : status === "unknown"
                    ? "Unknown"
                    : STATUS_LABEL[row.status]
              return (
                <li
                  key={row.name}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                        !data && loading
                          ? `${DOT.unknown} animate-pulse`
                          : DOT[row.status]
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{row.name}</p>
                      {data && row.detail ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {row.detail}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium flex-shrink-0 ${
                      !data
                        ? "text-muted-foreground"
                        : row.status === "operational"
                          ? "text-[#10B981]"
                          : row.status === "degraded"
                            ? "text-[#F59E0B]"
                            : "text-[#EF4444]"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {error ? (
          <p className="text-sm text-[#EF4444] mb-4" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground mb-4">
          Last checked: {checkedLabel}
        </p>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors"
        >
          {loading ? "Refreshing…" : "Refresh Status"}
        </button>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          This page is public and does not require a QFlow account.
        </p>
      </div>
    </div>
  )
}
