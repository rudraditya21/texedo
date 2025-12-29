import { Pool } from "pg"

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || "texedo"}:${process.env.POSTGRES_PASSWORD || "texedo_password"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB || "texedo_db"}`

const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool
}

export const db =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = db
}
