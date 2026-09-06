import 'dotenv/config'

import { defineConfig } from 'prisma/config'

/**
 * Connection used by the Prisma CLI — migrations and client generation. The
 * running application does not use this; it connects via lib/prisma.ts.
 *
 * These are deliberately allowed to differ. `migrate deploy` takes a
 * session-level advisory lock so two deploys cannot migrate at once, and a
 * transaction pooler cannot hold one: consecutive statements may land on
 * different backend sessions, so the lock is taken on one and looked for on
 * another, failing with P1002 after ten seconds.
 *
 * So migrations go over the direct endpoint (DIRECT_DATABASE_URL — the Neon
 * host without `-pooler`), while the application keeps the pooled one, which
 * is what it wants for connection limits.
 *
 * Falls back to DATABASE_URL, which is correct for local Postgres and CI,
 * where there is no pooler in front of the database.
 */
const migrationUrl =
  process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim()

if (!migrationUrl) {
  throw new Error(
    'Set DATABASE_URL (or DIRECT_DATABASE_URL) before running Prisma commands.',
  )
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
  },
})
