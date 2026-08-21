/**
 * End-to-end check for admin staff provisioning.
 * Run: node scripts/test-admin-staff.mjs
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

function loadEnv() {
  const env = {}
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (match) env[match[1]] = match[2].trim()
  }
  return env
}

const env = loadEnv()
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const stamp = Date.now()
const staffEmail = `qflow.staff.test.${stamp}@gmail.com`
const userEmail = `qflow.user.test.${stamp}@gmail.com`
const adminEmail = `qflow.admin.test.${stamp}@gmail.com`
const password = "TestPass123!"
const createdIds = []

function ok(step) {
  console.log(`ok    ${step}`)
}
function fail(step, err) {
  console.error(`FAIL  ${step}: ${err}`)
  process.exitCode = 1
}

async function cleanup() {
  for (const id of createdIds.reverse()) {
    await admin.auth.admin.deleteUser(id)
  }
}

try {
  const { error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (listErr) throw new Error(`service role auth: ${listErr.message}`)
  ok("service role can manage Auth users")

  const { data: locations, error: locErr } = await admin
    .from("locations")
    .select("id, name")
    .limit(1)
  if (locErr) throw new Error(locErr.message)
  if (!locations?.length) throw new Error("no locations in database")
  const location = locations[0]
  ok(`location available (${location.name})`)

  // Create staff the same way /api/admin/staff does
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: staffEmail,
    password,
    email_confirm: true,
    user_metadata: { name: "Test Staff" },
  })
  if (createErr || !created.user) throw new Error(createErr?.message || "no user")
  createdIds.push(created.user.id)

  const { error: updErr } = await admin
    .from("profiles")
    .update({ name: "Test Staff", role: "staff", location_id: location.id })
    .eq("id", created.user.id)

  if (updErr) {
    throw new Error(
      `profile promote failed: ${updErr.message} — run 20260802180000_admin_manage_staff.sql`
    )
  }
  ok("created staff + assigned location")

  const { data: profile } = await admin
    .from("profiles")
    .select("role, location_id")
    .eq("id", created.user.id)
    .single()

  if (profile?.role !== "staff") throw new Error(`expected staff role, got ${profile?.role}`)
  if (profile?.location_id !== location.id) throw new Error("location not assigned")
  ok("staff profile role + location correct")

  const { data: login, error: loginErr } = await anon.auth.signInWithPassword({
    email: staffEmail,
    password,
  })
  if (loginErr || !login.session) throw new Error(loginErr?.message || "no session")
  ok("staff can sign in with password")
  await anon.auth.signOut()

  // Public signup must not become staff via metadata
  const { data: pub, error: pubErr } = await anon.auth.signUp({
    email: userEmail,
    password,
    options: { data: { name: "Should Be User", role: "staff" } },
  })
  if (pubErr) throw new Error(`public signup: ${pubErr.message}`)
  if (pub.user) {
    createdIds.push(pub.user.id)
    await new Promise((r) => setTimeout(r, 1000))
    const { data: pubProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", pub.user.id)
      .maybeSingle()
    if (pubProfile?.role === "staff") {
      fail("public signup role lock", "metadata role=staff was accepted — migration not applied")
    } else {
      ok(`public signup stayed role=${pubProfile?.role ?? "user/pending"}`)
    }
  }

  // Temporary admin + HTTP API smoke test against local server
  const { data: adminUser, error: adminCreateErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: { name: "Test Admin" },
  })
  if (adminCreateErr || !adminUser.user) throw new Error(adminCreateErr?.message || "no admin")
  createdIds.push(adminUser.user.id)
  await admin
    .from("profiles")
    .update({ name: "Test Admin", role: "admin" })
    .eq("id", adminUser.user.id)
  ok("temporary admin ready for API test")

  const adminBrowser = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: adminSession, error: adminLoginErr } = await adminBrowser.auth.signInWithPassword({
    email: adminEmail,
    password,
  })
  if (adminLoginErr || !adminSession.session) {
    throw new Error(adminLoginErr?.message || "admin login failed")
  }

  const accessToken = adminSession.session.access_token
  const apiStaffEmail = `qflow.api.staff.${stamp}@gmail.com`

  const res = await fetch("http://localhost:3000/api/admin/staff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: "API Staff",
      email: apiStaffEmail,
      password,
      locationId: location.id,
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    fail("HTTP /api/admin/staff", `${res.status}: ${body.error || res.statusText}`)
  } else {
    ok("HTTP /api/admin/staff created staff")
    if (body.staff?.id) createdIds.push(body.staff.id)
  }

  const listRes = await fetch("http://localhost:3000/api/admin/staff", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const listBody = await listRes.json().catch(() => ({}))
  if (!listRes.ok) {
    fail("HTTP GET /api/admin/staff", `${listRes.status}: ${listBody.error || listRes.statusText}`)
  } else {
    const found = (listBody.staff || []).some((s) => s.email === apiStaffEmail)
    if (!found) fail("HTTP GET staff list", "new staff not listed")
    else ok("HTTP GET /api/admin/staff lists new staff")
  }

  await cleanup()
  ok("cleaned up test accounts")

  if (!process.exitCode) {
    console.log("\nALL CORE CHECKS PASSED")
  }
} catch (err) {
  fail("test", err instanceof Error ? err.message : String(err))
  await cleanup()
}
