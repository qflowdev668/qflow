/**
 * Fail the build if Supabase env vars are missing or still placeholders.
 * Always loads .env.local with override so stale shell exports cannot win.
 *
 *   npm run prebuild:web
 */
import { config } from "dotenv"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const envPath = resolve(root, ".env.local")

const PLACEHOLDER_MARKERS = [
  "abcdefgh",
  "your-project",
  "your-anon",
  "your-service",
  "your-anon-public-key",
  "your-service-role-key",
]

const shellUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const shellAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const shellService = process.env.SUPABASE_SERVICE_ROLE_KEY

const loaded = config({ path: envPath, override: true })
if (loaded.error && loaded.error.code !== "ENOENT") {
  console.error("❌ Could not read .env.local:", loaded.error.message)
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ""
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""

function looksPlaceholder(value) {
  if (!value) return true
  const lower = value.toLowerCase()
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker))
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (shellUrl && shellUrl !== url) {
  console.warn(
    `⚠ Overrode stale shell NEXT_PUBLIC_SUPABASE_URL (${shellUrl}) with .env.local (${url || "(empty)"})`
  )
}
if (shellAnon && shellAnon !== anon && looksPlaceholder(shellAnon)) {
  console.warn("⚠ Overrode stale shell NEXT_PUBLIC_SUPABASE_ANON_KEY with .env.local")
}
if (shellService && shellService !== service && looksPlaceholder(shellService)) {
  console.warn("⚠ Overrode stale shell SUPABASE_SERVICE_ROLE_KEY with .env.local")
}

const projectRefPattern = /^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/

if (!url || looksPlaceholder(url) || !projectRefPattern.test(url)) {
  fail(
    "❌ NEXT_PUBLIC_SUPABASE_URL is missing or a placeholder value. Refusing to build.\n" +
      `   Current value: ${url || "(not set)"}\n` +
      "   Copy real values from Supabase Dashboard → Settings → API into .env.local."
  )
}

if (!anon || looksPlaceholder(anon) || anon.length < 40) {
  fail(
    "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or a placeholder. Refusing to build.\n" +
      "   Set the anon/public key from Supabase Dashboard → Settings → API in .env.local."
  )
}

if (!service || looksPlaceholder(service) || service.length < 40) {
  if (process.env.CI === "true") {
    // Static `next export` only bakes NEXT_PUBLIC_* into the client bundle.
    // FastAPI uses the service role at runtime; CI builds do not need it present.
    console.warn(
      "⚠ SUPABASE_SERVICE_ROLE_KEY missing in CI — continuing static build with public keys only."
    )
  } else {
    fail(
      "❌ SUPABASE_SERVICE_ROLE_KEY is missing or a placeholder. Refusing to build.\n" +
        "   Set the service role key in .env.local (server-only — never commit)."
    )
  }
}

console.log("✅ Supabase URL looks real:", url)
console.log("✅ Anon and service role keys present (.env.local loaded with override)")
