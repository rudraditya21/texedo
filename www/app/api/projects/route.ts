import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type ProjectRow = {
  id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export async function GET() {
  const result = await db.query<ProjectRow>(
    "SELECT id, title, description, created_at, updated_at FROM projects ORDER BY created_at DESC"
  )
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string
    description?: string | null
  }
  const title = body.title?.trim()
  const description = body.description?.trim() || null

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 })
  }

  const result = await db.query<ProjectRow>(
    "INSERT INTO projects (title, description) VALUES ($1, $2) RETURNING id, title, description, created_at, updated_at",
    [title, description]
  )

  return NextResponse.json(result.rows[0], { status: 201 })
}
