import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  dir: "./",
})

/**
 * Phase 2 coverage gate — files with automated tests in this phase.
 * Dashboards / walk-in / remaining APIs are tested for behavior but stay off
 * the % gate until branch coverage is deepened (Phase 2b).
 */
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/e2e/",
  ],
  testMatch: ["**/__tests__/**/*.(test|spec).(ts|tsx)"],
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm/)?(msw|@mswjs|rettime|until-async|@open-draft)/)",
  ],
  collectCoverageFrom: [
    "app/api/rate/**/*.ts",
    "app/api/user/export-data/**/*.ts",
    "app/api/push/subscribe/**/*.ts",
    "app/api/status/**/*.ts",
    "app/api/queue/join/**/*.ts",
    "app/api/display/**/*.ts",
    "components/qflow/stats-card.tsx",
    "components/qflow/queue-status-badge.tsx",
    "components/qflow/password-rules.tsx",
    "components/qflow/location-card.tsx",
    "components/qflow/offline-banner.tsx",
    "components/qflow/bottom-nav.tsx",
    "components/qflow/kiosk-language-bar.tsx",
    "lib/password.ts",
    "lib/sms-format.ts",
    "lib/visit-rating.ts",
    "lib/admin-access.ts",
    "lib/rate-limit.ts",
    "lib/i18n.ts",
    "!**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 65,
      lines: 70,
      statements: 70,
    },
  },
}

export default createJestConfig(config)
