import sharp from "sharp"
import { writeFileSync } from "fs"

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#2563EB"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial, Helvetica, sans-serif" font-weight="700"
    font-size="${Math.round(size * 0.42)}" fill="#ffffff">Q</text>
</svg>`

async function writeIcon(size, file) {
  const buf = await sharp(Buffer.from(svg(size))).png().toBuffer()
  writeFileSync(file, buf)
  console.log("wrote", file, buf.length)
}

await writeIcon(192, "public/icon-192.png")
await writeIcon(512, "public/icon-512.png")
