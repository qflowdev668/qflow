import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

function getService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type Body = {
  message?: string
  name?: string
  stack?: string | null
  component_stack?: string | null
  path?: string | null
  user_agent?: string | null
}

/** Accepts ErrorBoundary reports for optional monitoring in client_errors. */
export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 })
  }

  const service = getService()
  if (!service) {
    // Env not configured — still 204 so the client does not retry loudly.
    return new NextResponse(null, { status: 204 })
  }

  const { error } = await service.from("client_errors").insert({
    message: message.slice(0, 2000),
    name: body.name?.slice(0, 200) ?? null,
    stack: body.stack?.slice(0, 8000) ?? null,
    component_stack: body.component_stack?.slice(0, 8000) ?? null,
    path: body.path?.slice(0, 500) ?? null,
    user_agent: body.user_agent?.slice(0, 500) ?? null,
  })

  if (error) {
    console.error("[api/errors]", error.message)
    return NextResponse.json({ error: "Could not store error." }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
