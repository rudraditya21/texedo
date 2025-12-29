import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getBucketName, uploadTextObject } from "@/lib/storage"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const body = (await request.json()) as {
    path?: string
    content?: string
  }
  const path = body.path?.trim() || "main.tex"
  const content = body.content ?? ""

  if (!path) {
    return NextResponse.json({ error: "Path is required." }, { status: 400 })
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
