import sharp from "sharp"
import { writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * Full-bleed brand tile. Glyph stays in the center ~80% so
 * `purpose: "any maskable"` works on Android adaptive icons.
 */
function svg(size) {
  const fontSize = Math.round(size * 0.38)
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#2563EB"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial, Helvetica, sans-serif" font-weight="700"
    font-size="${fontSize}" fill="#ffffff">Q</text>
</svg>`
}

async function writePng(size, file) {
  const buf = await sharp(Buffer.from(svg(size))).png().toBuffer()
  writeFileSync(file, buf)
  console.log("wrote", file, buf.length)
}

await writePng(192, "public/icon-192x192.png")
await writePng(512, "public/icon-512x512.png")
await writePng(180, "public/apple-touch-icon.png")

// Legacy filenames still referenced in a few places / caches
await writePng(192, "public/icon-192.png")
await writePng(512, "public/icon-512.png")

const pngToIco = (await import("png-to-ico")).default
const sizes = [16, 32, 48]
const tmpPngs = []
for (const size of sizes) {
  const tmp = join(tmpdir(), `qflow-favicon-${size}.png`)
  writeFileSync(tmp, await sharp(Buffer.from(svg(size))).png().toBuffer())
  tmpPngs.push(tmp)
}
const icoBuf = await pngToIco(tmpPngs)
writeFileSync("public/favicon.ico", icoBuf)
console.log("wrote public/favicon.ico", icoBuf.length)
