import Redis from "ioredis"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"

// ── Singleton client ──────────────────────────────────────────────────────────
const globalForRedis = globalThis as typeof globalThis & {
  redisClient?: Redis
}

function createClient(): Redis {
  const client = new Redis(env.redisUrl, {
    // Fail fast on individual commands so callers can fall back gracefully.
    maxRetriesPerRequest: 2,
    connectTimeout: 3_000,
    commandTimeout: 2_000,
    // Retry connection with backoff (ioredis default behaviour).
    enableReadyCheck: true,
    lazyConnect: false,
  })

  client.on("error", (err: Error) =>
    logger.error("Redis error", { error: err.message })
  )
  client.on("connect", () =>
    logger.info("Redis connected", { url: env.redisUrl })
  )
  client.on("reconnecting", () =>
    logger.warn("Redis reconnecting")
  )

  return client
}

export const redis: Redis =
  globalForRedis.redisClient ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redis
}

// ── Health probe ──────────────────────────────────────────────────────────────
export async function checkRedis(): Promise<boolean> {
  try {
    const reply = await redis.ping()
    return reply === "PONG"
  } catch {
    return false
  }
}

// ── Compiled PDF cache ────────────────────────────────────────────────────────
// PDFs are stored as binary Buffers. TTL is 5 minutes — long enough to absorb
// the debounce-heavy preview loop (same source → instant cache hit), short
// enough that stale content is not served for long.
const PDF_CACHE_TTL_S = 300

export async function getCachedPdf(sourceHash: string): Promise<Buffer | null> {
  try {
    return await redis.getBuffer(`pdf:${sourceHash}`)
  } catch {
    return null
  }
}

export async function cachePdf(sourceHash: string, pdf: Buffer): Promise<void> {
  try {
    await redis.setex(`pdf:${sourceHash}`, PDF_CACHE_TTL_S, pdf)
  } catch {
    // Cache write failure is non-fatal — compilation result is still returned.
  }
}

// ── Sliding-window rate limiter ───────────────────────────────────────────────
// Uses a Redis sorted set keyed by IP. Each request is a member with the
// current timestamp as its score. Entries older than the window are pruned
// atomically with each new request using a pipeline.
//
// Fails OPEN if Redis is unavailable — a degraded cache should not block
// legitimate traffic.
const RATE_LIMIT_MAX = 10
const RATE_WINDOW_MS = 60_000

export async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const key = `rl:latex:${ip}`
  const now = Date.now()
  const windowStart = now - RATE_WINDOW_MS

  try {
    // Unique member per request avoids score collisions at the same millisecond.
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`

    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart) // evict expired entries
    pipeline.zadd(key, now, member)                // record this request
    pipeline.zcard(key)                            // count in window
    pipeline.pexpire(key, RATE_WINDOW_MS)          // auto-cleanup key

    const results = await pipeline.exec()
    if (!results) throw new Error("Pipeline returned null")

    const count = results[2][1] as number

    if (count > RATE_LIMIT_MAX) {
      // Compute exact retry delay from the oldest entry in the window.
      const oldest = await redis.zrange(key, 0, 0, "WITHSCORES")
      const oldestTs = oldest.length >= 2 ? Number(oldest[1]) : now
      const retryAfterMs = Math.max(0, oldestTs + RATE_WINDOW_MS - now)
      return { allowed: false, retryAfterMs }
    }

    return { allowed: true, retryAfterMs: 0 }
  } catch (err) {
    logger.warn("Redis rate limiter unavailable — failing open", {
      ip,
      error: String(err),
    })
    return { allowed: true, retryAfterMs: 0 }
  }
}
