/**
 * Run `next build` after loading .env.local with override.
 * Prevents stale shell NEXT_PUBLIC_* values from baking into the static export.
 */
import { spawnSync } from "node:child_process"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

config({ path: resolve(root, ".env.local"), override: true })

const result = spawnSync("next", ["build"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
})

process.exit(result.status ?? 1)
