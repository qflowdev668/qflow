import { apiFetch } from "@/lib/api-client"

/** Fire-and-forget Web Push for a queue lifecycle event (staff/admin session). */
export function dispatchQueuePush(input: {
  userId: string | null | undefined
  title?: string
  body: string
  url?: string
}) {
  if (!input.userId || typeof window === "undefined") return
  void apiFetch("/api/push/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: input.userId,
      title: input.title ?? "QFlow",
      body: input.body,
      url: input.url ?? "/notifications",
    }),
  }).catch(() => {
    /* push is best-effort */
  })
}
