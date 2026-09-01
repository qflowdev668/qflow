/**
 * Optional MSW Node server helper.
 * Prefer Jest module mocks for API routes; start this only in suites that need HTTP interception.
 * MSW v2 + Jest ESM can be fragile — keep usage opt-in.
 */
import { setupServer } from "msw/node"
import { handlers } from "./handlers"

export const server = setupServer(...handlers)
