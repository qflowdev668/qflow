/** Public support inbox. Baked from NEXT_PUBLIC_SUPPORT_EMAIL at build time. */
export const SUPPORT_EMAIL = (
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@useqflow.app"
).trim() || "support@useqflow.app"
