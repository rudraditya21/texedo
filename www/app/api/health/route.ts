import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkBucket } from "@/lib/storage"
import { checkRedis } from "@/lib/redis"

export async function GET() {
  const [dbOnline, minioOnline, redisOnline] = await Promise.allSettled([
    db.query("SELECT 1").then(() => true).catch(() => false),
    checkBucket(),
    checkRedis(),
  ]).then((results) =>
    results.map((r) => (r.status === "fulfilled" ? r.value : false))
  )

  const allOnline = dbOnline && minioOnline && redisOnline

  return NextResponse.json({
    status: allOnline ? "online" : "degraded",
    db: dbOnline ? "online" : "offline",
    minio: minioOnline ? "online" : "offline",
    redis: redisOnline ? "online" : "offline",
  })
}
