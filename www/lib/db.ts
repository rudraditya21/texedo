import { Pool } from "pg"
import { getDbConnectionString } from "@/lib/env"

const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool
}

export const db =
  globalForDb.pgPool ??
  new Pool({
    connectionString: getDbConnectionString(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3_000,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = db
}
