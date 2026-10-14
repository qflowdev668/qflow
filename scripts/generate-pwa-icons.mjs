import { copyFileSync } from "fs"

/** Copy the official kit into public/. Does not redraw or recolour the mark. */
const copies = [
  ["QFlow_Logo_Kit/png/favicon.ico", "public/favicon.ico"],
  ["QFlow_Logo_Kit/png/favicon-16.png", "public/favicon-16.png"],
  ["QFlow_Logo_Kit/png/favicon-32.png", "public/favicon-32.png"],
  ["QFlow_Logo_Kit/png/favicon-48.png", "public/favicon-48.png"],
  ["QFlow_Logo_Kit/svg/qflow-favicon.svg", "public/favicon.svg"],
  ["QFlow_Logo_Kit/png/apple-touch-icon-180.png", "public/apple-touch-icon-180.png"],
  ["QFlow_Logo_Kit/png/apple-touch-icon-180.png", "public/apple-touch-icon.png"],
  ["QFlow_Logo_Kit/png/icon-192.png", "public/icon-192.png"],
  ["QFlow_Logo_Kit/png/icon-512.png", "public/icon-512.png"],
  ["QFlow_Logo_Kit/png/icon-maskable-512.png", "public/icon-maskable-512.png"],
  ["QFlow_Logo_Kit/png/notification-badge-96.png", "public/notification-badge-96.png"],
  ["QFlow_Logo_Kit/png/og-share-1200x630.png", "public/og-share-1200x630.png"],
  ["QFlow_Logo_Kit/png/wordmark-color.png", "public/wordmark-color.png"],
]

for (const [from, to] of copies) {
  copyFileSync(from, to)
  console.log("copied", to)
}
