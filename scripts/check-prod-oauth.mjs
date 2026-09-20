const res = await fetch("https://useqflow.app/login/")
const html = await res.text()
const scripts = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))]
console.log("status", res.status, "scripts", scripts.length)
for (const s of scripts.slice(0, 40)) console.log(s)

let foundLocal = false
let foundCallback = false
for (const s of scripts) {
  const js = await (await fetch(`https://useqflow.app${s}`)).text()
  if (js.includes("localhost:3000")) {
    console.log("HAS localhost:3000 ->", s)
    foundLocal = true
  }
  if (js.includes("auth/callback")) {
    console.log("HAS auth/callback ->", s)
    foundCallback = true
    const idx = js.indexOf("auth/callback")
    console.log("snippet:", js.slice(Math.max(0, idx - 80), idx + 40).replace(/\s+/g, " "))
  }
}
console.log("summary", { foundLocal, foundCallback })
