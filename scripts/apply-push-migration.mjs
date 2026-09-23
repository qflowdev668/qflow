/**
 * Apply push_subscriptions migration using the Supabase SQL API when possible,
 * otherwise create tables via a service-role workaround check + instruct.
 *
 * Prefers: DATABASE_URL or SUPABASE_DB_PASSWORD + project ref
 * Fallback: Management API with SUPABASE_ACCESS_TOKEN
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
    /* optional */
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const ref = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const accessToken = process.env.SUPABASE_ACCESS_TOKEN
const dbPassword = process.env.SUPABASE_DB_PASSWORD
const databaseUrl = process.env.DATABASE_URL

const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/20260821000000_push_subscriptions.sql"
)
const sql = readFileSync(migrationPath, "utf8")

async function tableExists() {
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await supabase.from("push_subscriptions").select("id", { head: true, count: "exact" })
  if (!error) return true
  if (/Could not find the table|relation .* does not exist|schema cache/i.test(error.message)) {
    return false
  }
  // RLS / permission still means table exists
  if (/permission denied|row-level security/i.test(error.message)) return true
  console.warn("check:", error.message)
  return false
}

async function runViaManagementApi() {
  if (!accessToken || !ref) return false
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const text = await res.text()
  if (!res.ok) {
    console.error("Management API failed:", res.status, text)
    return false
  }
  console.log("ok    migration applied via Management API")
  return true
}

async function runViaPg() {
  let connectionString = databaseUrl
  if (!connectionString && dbPassword && ref) {
    connectionString = `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
  }
  if (!connectionString) return false

  let pg
  try {
    pg = await import("pg")
  } catch {
    console.log("Installing pg…")
    const { execSync } = await import("node:child_process")
    execSync("npm install pg --no-save", { stdio: "inherit", cwd: resolve(__dirname, "..") })
    pg = await import("pg")
  }

  const client = new pg.default.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    await client.query(sql)
    console.log("ok    migration applied via Postgres")
    return true
  } finally {
    await client.end()
  }
}

async function upsertAppSettings() {
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL?.replace(/^/, "https://") ||
    "https://useqflow.app"
  const secret = process.env.PUSH_DISPATCH_SECRET || "qflow-push-dispatch-change-me"

  const rows = [
    { key: "push_dispatch_url", value: `${appUrl.replace(/\/$/, "")}/api/push/dispatch` },
    { key: "push_dispatch_secret", value: secret },
  ]

  for (const row of rows) {
    const { error } = await supabase.from("app_settings").upsert(row, { onConflict: "key" })
    if (error) {
      console.error(`FAIL  app_settings ${row.key}:`, error.message)
      return false
    }
    console.log(`ok    app_settings.${row.key} = ${row.key === "push_dispatch_secret" ? "(set)" : row.value}`)
  }
  return true
}

if (!url || !serviceKey) {
  console.error("FAIL  Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const exists = await tableExists()
if (exists) {
  console.log("ok    push_subscriptions already exists")
} else {
  console.log("…     applying 20260821000000_push_subscriptions.sql")
  let applied = await runViaManagementApi()
  if (!applied) applied = await runViaPg()
  if (!applied) {
    console.error(`
FAIL  Could not apply migration automatically (no SUPABASE_ACCESS_TOKEN / DATABASE_URL / SUPABASE_DB_PASSWORD).

Run this in the Supabase SQL Editor, then re-run:
  node scripts/apply-push-migration.mjs

Or:
  set SUPABASE_ACCESS_TOKEN=sbp_...
  node scripts/apply-push-migration.mjs
`)
    process.exit(1)
  }
}

const ready = await tableExists()
if (!ready) {
  console.error("FAIL  Table still missing after apply")
  process.exit(1)
}

await upsertAppSettings()
console.log("done")
