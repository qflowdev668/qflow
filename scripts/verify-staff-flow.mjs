/**
 * End-to-end staff queue flow against live Supabase (service role).
 *
 *   node scripts/verify-staff-flow.mjs
 *
 * Creates and mutates real queue_entries. Refuses URLs that look like
 * production unless SUPABASE_TEST_CONFIRM=yes. Prefer a dedicated
 * Supabase test project (URL containing -dev / -test / staging).
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
    // optional
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const fail = (msg) => {
  console.error(`FAIL  ${msg}`)
  process.exitCode = 1
}
const ok = (msg) => console.log(`ok    ${msg}`)

/**
 * Refuse accidental runs against production. Safe without confirm only when the
 * project URL matches a recognized non-prod naming pattern (-dev, -test, etc.).
 * Override: SUPABASE_TEST_CONFIRM=yes
 */
function assertSafeSupabaseTarget(supabaseUrl) {
  const u = (supabaseUrl || "").toLowerCase()
  const looksNonProd =
    u.includes("-dev") ||
    u.includes("-test") ||
    u.includes("staging") ||
    u.includes("localhost") ||
    u.includes("127.0.0.1") ||
    u.includes(".local")
  const looksProd =
    u.includes("qflow-prod") ||
    u.includes("-prod.") ||
    u.includes("-prod-") ||
    process.env.NODE_ENV === "production"
  const isProd = Boolean(supabaseUrl) && (looksProd || !looksNonProd)

  if (!isProd) return

  console.error(
    "❌ Refusing to run test:staff-flow against what looks like a production Supabase project.\n" +
      "This script creates and mutates real queue data. Set SUPABASE_TEST_CONFIRM=yes to override.\n" +
      `Target: ${supabaseUrl}`
  )
  if (process.env.SUPABASE_TEST_CONFIRM !== "yes") {
    process.exit(1)
  }
  console.warn("⚠️  SUPABASE_TEST_CONFIRM=yes — proceeding against this project anyway.\n")
}

if (!url || !serviceKey) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local")
  process.exit(1)
}

assertSafeSupabaseTarget(url)

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_NAME = `E2E Walk-in ${Date.now()}`

async function main() {
  console.log("Staff flow verification\n")

  const { data: staff, error: staffErr } = await admin
    .from("profiles")
    .select("id, email, name, location_id")
    .eq("role", "staff")
    .not("location_id", "is", null)
    .limit(1)
    .maybeSingle()

  if (staffErr || !staff) {
    fail(`no staff profile with location_id: ${staffErr?.message ?? "none found"}`)
    return
  }
  ok(`staff ${staff.email ?? staff.id} @ location ${staff.location_id}`)

  const locationId = staff.location_id

  // Clear stuck serving tickets at this location from earlier failed runs
  const { data: stuck } = await admin
    .from("queue_entries")
    .select("id, walk_in_name, position")
    .eq("location_id", locationId)
    .eq("status", "serving")

  if (stuck?.length) {
    for (const row of stuck) {
      await admin
        .from("queue_entries")
        .update({
          status: "served",
          served_at: new Date().toISOString(),
          serving_by: null,
          serving_started_at: null,
        })
        .eq("id", row.id)
    }
    ok(`cleared ${stuck.length} stuck serving ticket(s)`)
  }

  const { data: walkIn, error: insertErr } = await admin
    .from("queue_entries")
    .insert({
      location_id: locationId,
      is_walk_in: true,
      walk_in_name: TEST_NAME,
      priority: "standard",
    })
    .select("id, position")
    .single()

  if (insertErr || !walkIn) {
    fail(`walk-in insert: ${insertErr?.message ?? "no row"}`)
    return
  }
  ok(`added walk-in "${TEST_NAME}" at position ${walkIn.position}`)

  const { data: claimed, error: claimErr } = await admin
    .from("queue_entries")
    .update({
      status: "serving",
      serving_by: staff.id,
      serving_started_at: new Date().toISOString(),
    })
    .eq("id", walkIn.id)
    .eq("location_id", locationId)
    .in("status", ["waiting", "almost", "your-turn"])
    .select("id, position, walk_in_name, status")
    .single()

  if (claimErr || !claimed?.position) {
    fail(`claim update: ${claimErr?.message ?? "missing position"}`)
    return
  }
  ok(`claimed ticket #${String(claimed.position).padStart(3, "0")} (${claimed.walk_in_name})`)

  const ticket = `#${String(claimed.position).padStart(3, "0")}`
  if (ticket.includes("null")) {
    fail(`ticket number invalid: ${ticket}`)
    return
  }

  const { data: finished, error: finishErr } = await admin
    .from("queue_entries")
    .update({
      status: "served",
      served_at: new Date().toISOString(),
      serving_by: null,
      serving_started_at: null,
    })
    .eq("id", walkIn.id)
    .eq("status", "serving")
    .select("id, status")
    .single()

  if (finishErr || finished?.status !== "served") {
    fail(`finish update: ${finishErr?.message ?? finished?.status}`)
    return
  }
  ok("marked served")

  const { data: waiting } = await admin
    .from("queue_entries")
    .select("id")
    .eq("id", walkIn.id)
    .in("status", ["waiting", "almost", "your-turn", "serving"])

  if (waiting?.length) {
    fail("walk-in still active in queue after finish")
    return
  }
  ok("removed from active queue")

  const { data: listed } = await admin
    .from("queue_entries")
    .select("id, position, walk_in_name, is_walk_in")
    .eq("location_id", locationId)
    .in("status", ["waiting", "almost", "your-turn"])
    .order("position")

  ok(`location now has ${listed?.length ?? 0} waiting (standard list)`)

  if (process.exitCode) {
    console.error("\nStaff flow verification FAILED")
  } else {
    console.log("\nStaff flow verification PASSED")
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
