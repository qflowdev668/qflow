/**
 * Verifies the Supabase setup end to end: env vars, every table the app reads,
 * the seeded locations, and that RLS is actually switched on.
 *
 *   npm run check:supabase
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
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

const fail = (msg) => {
  console.error(`FAIL  ${msg}`)
  process.exitCode = 1
}
const ok = (msg) => console.log(`ok    ${msg}`)

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

if (process.exitCode) {
  console.error("\nSetup incomplete.")
} else {
  console.log("\nSupabase is wired up correctly.")
}
