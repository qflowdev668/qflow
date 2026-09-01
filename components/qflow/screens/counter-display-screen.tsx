"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { apiFetch } from "@/lib/api-client"

type DisplayPayload = {
  locationId: string
  locationName: string
  nowServing: { ticket: string; startedAt: string | null } | null
  recentlyCalled: { ticket: string; calledAt: string | null }[]
  updatedAt: string
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatCalledAt(iso: string | null) {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export function CounterDisplayScreen({ locationId }: { locationId: string }) {
  const [data, setData] = useState<DisplayPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [live, setLive] = useState(true)

  const load = useCallback(async () => {
    if (!locationId) return
    try {
      const res = await apiFetch(`/api/display/${locationId}`, { public: true, cache: "no-store" })
      const json = (await res.json()) as DisplayPayload & { error?: string }
      if (!res.ok) {
        setError(json.error ?? "Could not load display.")
        setLive(false)
        return
      }
      setData(json)
      setError(null)
      setLive(true)
    } catch {
      setError("Could not load display.")
      setLive(false)
    }
  }, [locationId])

  useEffect(() => {
    void load()
  }, [load])

  // Clock tick
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Realtime: locations.queue_count + queue_entries changes → refetch (API keeps PII off the client)
  useEffect(() => {
    if (!locationId) return

    const supabase = createClient()
    if (!supabase) {
      const poll = window.setInterval(() => void load(), 3000)
      return () => window.clearInterval(poll)
    }

    const channel = supabase
      .channel(`counter-display:${locationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          void load()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "locations",
          filter: `id=eq.${locationId}`,
        },
        () => {
          void load()
        }
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED")
      })

    const poll = window.setInterval(() => void load(), 15000)

    return () => {
      window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [locationId, load])

  const ticket = data?.nowServing?.ticket ?? "—"

  return (
    <div className="fixed inset-0 flex flex-col text-white overflow-hidden select-none"
      style={{ backgroundColor: "#2563EB" }}
    >
      {/* Top — NOW SERVING (40%) */}
      <section className="h-[40%] flex flex-col items-center justify-center px-6 border-b border-white/15">
        <p
          className="uppercase tracking-[0.2em] font-semibold text-white/90 mb-2"
          style={{ fontSize: 32 }}
        >
          Now Serving
        </p>
        <p
          className="font-bold leading-none tabular-nums"
          style={{ fontSize: "clamp(96px, 22vw, 180px)" }}
          aria-live="polite"
        >
          {ticket}
        </p>
        {!data?.nowServing && !error && (
          <p className="mt-4 text-white/70 text-lg">Waiting for next customer…</p>
        )}
      </section>

      {/* Bottom — RECENTLY CALLED (60%) */}
      <section className="flex-1 flex flex-col px-8 pt-8 pb-28 min-h-0">
        <p
          className="uppercase tracking-widest font-medium mb-6"
          style={{ fontSize: 18, color: "#D1D5DB" }}
        >
          Recently Called
        </p>

        {error ? (
          <p className="text-white/80 text-lg">{error}</p>
        ) : (
          <ul className="space-y-4 overflow-y-auto">
            {(data?.recentlyCalled ?? []).length === 0 ? (
              <li className="text-white/60 text-2xl">No tickets called yet today</li>
            ) : (
              (data?.recentlyCalled ?? []).map((row) => (
                <li
                  key={`${row.ticket}-${row.calledAt}`}
                  className="flex items-baseline justify-between gap-6 border-b border-white/10 pb-3"
                >
                  <span className="font-semibold tabular-nums" style={{ fontSize: 48 }}>
                    #{row.ticket}
                  </span>
                  <span className="text-white/70 text-xl tabular-nums">
                    {formatCalledAt(row.calledAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {/* Bottom bar */}
      <footer className="absolute bottom-0 inset-x-0 h-20 px-6 flex items-center justify-between gap-4 bg-[#1D4ED8]/90 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
            <svg viewBox="0 0 40 40" className="w-7 h-7 text-[#2563EB]" aria-hidden>
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
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">QFlow</p>
            <p className="text-white/80 text-sm truncate">
              {data?.locationName ?? "…"}
            </p>
          </div>
        </div>

        <p className="text-xl font-medium tabular-nums shrink-0">{formatClock(now)}</p>

        <div className="flex items-center gap-2 shrink-0 text-sm font-medium">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 ${
              live ? "animate-pulse" : "opacity-40"
            }`}
            aria-hidden
          />
          <span className={live ? "text-emerald-200" : "text-white/50"}>
            {live ? "Live" : "Reconnecting"}
          </span>
        </div>
      </footer>
    </div>
  )
}
