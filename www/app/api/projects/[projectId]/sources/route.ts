import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getBucketName, getTextObject, uploadTextObject } from "@/lib/storage"

const PATH_MAX = 255
const CONTENT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidPath(p: string): boolean {
  if (!p || p.length > PATH_MAX) return false
  // Reject directory traversal, absolute paths, null bytes, and
  // characters that are unsafe in object-storage keys.
  if (p.includes("..") || p.startsWith("/") || p.includes("\0")) return false
  return /^[a-zA-Z0-9._\-/]+$/.test(p)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  if (!UUID_RE.test(projectId)) {
    return NextResponse.json({ error: "Invalid project ID." }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  if (!path || !isValidPath(path)) {
    return NextResponse.json({ error: "Invalid or missing path parameter." }, { status: 400 })
  }

  const projectCheck = await db.query("SELECT id FROM projects WHERE id = $1", [projectId])
  if (projectCheck.rowCount === 0) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  const sourceResult = await db.query<{
    id: string
    path: string
    content: string | null
    object_key: string | null
  }>(
    "SELECT id, path, content, object_key FROM project_sources WHERE project_id = $1 AND path = $2",
    [projectId, path]
  )

  if (sourceResult.rowCount === 0) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 })
  }

  const source = sourceResult.rows[0]
  let content = ""

  if (source.object_key) {
    content = (await getTextObject(source.object_key)) ?? ""
  } else if (source.content) {
    content = source.content
  }

  return NextResponse.json({ id: source.id, path: source.path, content })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  if (!UUID_RE.test(projectId)) {
    return NextResponse.json({ error: "Invalid project ID." }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { path: rawPath, content: rawContent } = body as Record<string, unknown>

  const path = typeof rawPath === "string" ? rawPath.trim() : "main.tex"
  if (!isValidPath(path)) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 })
  }

  if (rawContent !== undefined && typeof rawContent !== "string") {
    return NextResponse.json({ error: "Content must be a string." }, { status: 400 })
  }

  const content = typeof rawContent === "string" ? rawContent : ""

  if (Buffer.byteLength(content, "utf8") > CONTENT_MAX_BYTES) {
    return NextResponse.json(
      { error: "Content exceeds the 5 MB limit per file." },
      { status: 400 }
    )
  }

  const projectResult = await db.query(
    "SELECT id FROM projects WHERE id = $1",
    [projectId]
  )
  if (projectResult.rowCount === 0) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  const objectKey = `projects/${projectId}/${path}`
  await uploadTextObject(objectKey, content)
  await db.query(
    `INSERT INTO project_sources (project_id, path, content, bucket, object_key)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id, path)
     DO UPDATE SET bucket = EXCLUDED.bucket, object_key = EXCLUDED.object_key, content = NULL, updated_at = NOW()`,
    [projectId, path, null, getBucketName(), objectKey]
  )

  return NextResponse.json({ ok: true })
}
