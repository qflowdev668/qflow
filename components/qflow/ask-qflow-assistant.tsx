"use client"

import { useEffect, useId, useRef, useState } from "react"
import { apiFetch, formatApiErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Send, Sparkles } from "lucide-react"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

const STARTERS = [
  "How long is my wait?",
  "What is Fast Track?",
  "How do I get directions?",
]

const FALLBACK_ERROR = "Couldn't get an answer. Please try again."

type AskQflowAssistantProps = {
  /** Place the person is looking at, so answers can name that drawer. */
  placeName?: string
  /** Icon and label only, for sheets that should stay open and quiet. */
  compact?: boolean
  className?: string
}

export function AskQflowAssistant({
  placeName,
  compact = false,
  className,
}: AskQflowAssistantProps = {}) {
  const inputId = useId()
  const conversationId = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "ask-qflow"
  )
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState("")
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    void apiFetch("/api/assistant/model", { public: true })
      .then(async (response) => {
        if (!response.ok) return
        const payload: unknown = await response.json().catch(() => null)
        const next =
          payload && typeof payload === "object" && "model" in payload
            ? String((payload as { model?: unknown }).model ?? "").trim()
            : ""
        if (!cancelled && next) setModel(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || loading) return
    const history = messages.map((message) => ({
      role: message.role,
      content: message.text,
    }))
    setError(null)
    setDraft("")
    setMessages((prev) => [...prev, { id: `user-${prev.length}`, role: "user", text }])
    setLoading(true)
    try {
      const response = await apiFetch("/api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId.current,
          history,
          ...(placeName ? { place_name: placeName.slice(0, 80) } : {}),
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        setError(formatApiErrorMessage(payload, FALLBACK_ERROR))
        return
      }
      const reply =
        payload && typeof payload === "object" && "reply" in payload
          ? String((payload as { reply?: unknown }).reply ?? "").trim()
          : ""
      const answeredBy =
        payload && typeof payload === "object" && "model" in payload
          ? String((payload as { model?: unknown }).model ?? "").trim()
          : ""
      if (answeredBy) setModel(answeredBy)
      if (!reply) {
        setError(FALLBACK_ERROR)
        return
      }
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${prev.length}`, role: "assistant", text: reply },
      ])
      requestAnimationFrame(() => {
        const list = listRef.current
        if (list && typeof list.scrollTo === "function") {
          list.scrollTo({ top: list.scrollHeight })
        }
      })
    } catch {
      setError(FALLBACK_ERROR)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={cn("mb-8", className)} aria-label="Ask QFlow">
      <button
        type="button"
        data-testid="ask-qflow-toggle"
        aria-expanded={open}
        aria-controls="ask-qflow-panel"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center text-left",
          compact
            ? "mx-auto gap-2.5 rounded-full border border-border/80 bg-card py-1.5 pl-1.5 pr-4"
            : "w-full gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3"
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
            compact ? "h-9 w-9" : "h-10 w-10"
          )}
        >
          <Sparkles className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
        </span>
        {compact ? (
          <span className="text-sm font-semibold text-foreground">Ask QFlow</span>
        ) : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-foreground">Ask QFlow</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Questions about your line, answered in plain language.
              </span>
            </span>
            <span
              data-testid="powered-by-llama"
              className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
            >
              Powered by Llama
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          id="ask-qflow-panel"
          data-testid="ask-qflow-panel"
          role="region"
          aria-label="Ask QFlow chat"
          aria-busy={loading}
          className="mt-3 rounded-2xl border border-border/80 bg-card p-3"
        >
          <p data-testid="ask-qflow-model" className="mb-3 text-xs text-muted-foreground">
            Powered by Llama{model ? ` — ${model}` : ""}. Answers use your first name and your line, not your email or phone.
          </p>

          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto"
          >
            {messages.length === 0 && !loading && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Try one of these:</p>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      data-testid="ask-qflow-chip"
                      className="rounded-full border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground"
                      onClick={() => void send(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <p
                key={message.id}
                data-testid={message.role === "assistant" ? "ask-qflow-reply" : "ask-qflow-user"}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-base leading-relaxed",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground"
                )}
              >
                {message.text}
              </p>
            ))}

            {loading && (
              <p
                data-testid="ask-qflow-loading"
                className="mr-auto flex items-center gap-1 rounded-2xl bg-muted px-3 py-2"
                role="status"
              >
                <span className="sr-only">Waiting for a reply</span>
                <span className="h-2 w-2 rounded-full bg-foreground motion-reduce:animate-none animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-foreground motion-reduce:animate-none animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-foreground motion-reduce:animate-none animate-bounce [animation-delay:300ms]" />
              </p>
            )}
          </div>

          {error && (
            <p data-testid="ask-qflow-error" role="alert" className="mb-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void send(draft)
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              Ask a question
            </label>
            <input
              id={inputId}
              data-testid="ask-qflow-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your line"
              className="min-h-12 flex-1 rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground"
              autoComplete="off"
            />
            <button
              type="submit"
              data-testid="ask-qflow-send"
              disabled={loading || !draft.trim()}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              <span className="sr-only">Send</span>
              <Send className="h-5 w-5" aria-hidden />
            </button>
          </form>
        </div>
      )}
    </section>
  )
}
