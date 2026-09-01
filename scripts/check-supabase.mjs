/**
 * Verifies the Supabase setup end to end: env vars, every table the app reads,
 * the seeded locations, RLS, and whether pg_net is available for DB→push fan-out.
 *
 *   npm run check:supabase
 *
 * pg_net SQL (also in scripts/check-pg-net.sql):
 *   SELECT * FROM pg_extension WHERE extname = 'pg_net';
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
      if (!match) continue
      const [, key, value] = match
      if (!process.env[key]) process.env[key] = value.trim()
    }
  } catch {
    // .env.local is optional when the vars are already exported
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const accessToken = process.env.SUPABASE_ACCESS_TOKEN
const ref = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

const fail = (msg) => {
  console.error(`FAIL  ${msg}`)
  process.exitCode = 1
}
const ok = (msg) => console.log(`ok    ${msg}`)
const warn = (msg) => console.warn(`warn  ${msg}`)

function printPgNetFallback() {
  console.log(`
  Fallback (no pg_net required):
  1. Staff/app already dispatches push from the client (call next / finish).
  2. Deploy the Edge Function:
       npm run functions:deploy
     # or: supabase functions deploy push-dispatch
  3. Set secrets:
       supabase secrets set PUSH_DISPATCH_SECRET=… NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
  4. Preferred: Database Webhooks → queue_entries UPDATE + notifications INSERT
     → https://YOUR_PROJECT.supabase.co/functions/v1/push-dispatch
     (Authorization: Bearer PUSH_DISPATCH_SECRET)
  5. Or poll on a schedule:
       GET …/functions/v1/push-dispatch?mode=poll
       Header: Authorization: Bearer PUSH_DISPATCH_SECRET

  See scripts/check-pg-net.sql and supabase/functions/push-dispatch/
`)
}

if (!url) {
  fail("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local")
  process.exit(1)
}
if (!key) {
  fail(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is empty in .env.local — copy the anon/public key from Project Settings > API"
  )
  process.exit(1)
}

ok(`project url ${url}`)

const supabase = createClient(url, key)

const tables = [
  "profiles",
  "locations",
  "queue_entries",
  "notifications",
  "queue_history",
  "audit_log",
]

let missing = 0

for (const table of tables) {
  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" })

  if (!error) {
    ok(`table ${table} reachable`)
    continue
  }

  // An RLS denial still proves the table exists
  if (/permission denied|row-level security/i.test(error.message)) {
    ok(`table ${table} exists (protected by RLS)`)
    continue
  }

  missing += 1
  fail(`table ${table}: ${error.message}`)
}

if (missing > 0) {
  console.error(
    "\nSome tables are missing. Run supabase/schema.sql in the Supabase SQL Editor."
  )
  process.exit(1)
}

const { data: locations, error: locError } = await supabase
  .from("locations")
  .select("id, name, queue_count")
  .order("name")

if (locError) {
  fail(`reading locations: ${locError.message}`)
} else if (!locations || locations.length === 0) {
  fail("locations table is empty — the seed insert at the end of schema.sql did not run")
} else {
  ok(`${locations.length} locations seeded`)
  for (const l of locations) {
    console.log(`        ${l.name} (queue_count ${l.queue_count})`)
  }
}

// Added by the queue priority migration
const { error: priorityError } = await supabase
  .from("queue_entries")
  .select("priority, priority_category")
  .limit(1)

if (priorityError) {
  fail(
    "queue_entries is missing the priority columns — run supabase/migrations/20260801120000_queue_priority.sql"
  )
} else {
  ok("queue_entries has the priority columns")
}

// profiles must NOT be world readable
const { data: leaked } = await supabase.from("profiles").select("id").limit(1)
if (leaked && leaked.length > 0) {
  fail("anonymous requests can read profiles — check that RLS is enabled")
} else {
  ok("profiles is not readable anonymously (RLS active)")
}

const PG_NET_SQL = `SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net'`

/**
 * Try Management API, then optional Postgres URL — pg_extension is not in PostgREST.
 */
async function checkPgNetExtension() {
  if (accessToken && ref) {
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/database/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: PG_NET_SQL }),
        }
      )
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
      if (!res.ok) {
        return { ok: false, error: typeof data === "string" ? data : JSON.stringify(data) }
      }
      const rows = Array.isArray(data) ? data : data?.rows ?? data?.data ?? []
      return { ok: true, rows: Array.isArray(rows) ? rows : [] }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    null

  if (connectionString) {
    try {
      const pg = (await import("pg")).default
      const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
      })
      await client.connect()
      try {
        const result = await client.query(PG_NET_SQL)
        return { ok: true, rows: result.rows }
      } finally {
        await client.end()
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  return {
    ok: false,
    error:
      "Set SUPABASE_ACCESS_TOKEN (or DATABASE_URL) to probe pg_net automatically. SQL: scripts/check-pg-net.sql",
  }
}

console.log("\n— pg_net (DB → /api/push/dispatch) —")
const pgNet = await checkPgNetExtension()
if (pgNet.ok) {
  if (pgNet.rows.length > 0) {
    const row = pgNet.rows[0]
    ok(`pg_net installed${row.extversion ? ` (v${row.extversion})` : ""}`)
    ok("DB webhook fan-out via net.http_post can work when app_settings is set")
  } else {
    warn("pg_net is NOT installed on this project")
    printPgNetFallback()
  }
} else {
  warn(`could not verify pg_net: ${pgNet.error}`)
  printPgNetFallback()
}

// Soft check: optional tables from later migrations
if (serviceKey) {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: pushErr } = await admin
    .from("push_subscriptions")
    .select("id", { head: true, count: "exact" })
  if (pushErr && /Could not find the table|schema cache/i.test(pushErr.message)) {
    warn("push_subscriptions missing — run npm run db:push (push migration)")
  } else if (!pushErr) {
    ok("push_subscriptions reachable")
  }
}

if (process.exitCode) {
  console.error("\nSetup incomplete.")
} else {
  console.log("\nSupabase is wired up correctly.")
}
