const email = process.argv[2] || "jewolex235@airychen.com"
const password = process.argv[3] || "wrong-password-probe"

const res = await fetch("https://useqflow.app/api/staff/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
})
const text = await res.text()
console.log("status", res.status)
console.log("body", text.slice(0, 500))
