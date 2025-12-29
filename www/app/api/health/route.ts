import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkBucket } from "@/lib/storage"

export async function GET() {
  let dbOnline = false
  let minioOnline = false

  try {
    await db.query("SELECT 1")
    dbOnline = true
  } catch {
    dbOnline = false
  }

  try {
    minioOnline = await checkBucket()
  } catch {
    minioOnline = false
  }

  const allOnline = dbOnline && minioOnline

  return NextResponse.json({
    status: allOnline ? "online" : "degraded",
    db: dbOnline ? "online" : "offline",
    minio: minioOnline ? "online" : "offline",
  })
}
