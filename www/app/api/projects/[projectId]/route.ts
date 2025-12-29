import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getBucketName, getTextObject, uploadTextObject } from "@/lib/storage"

type ProjectRow = {
  id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

type SourceRow = {
  id: string
  project_id: string
  path: string
  content: string | null
  bucket: string | null
  object_key: string | null
  created_at: string
  updated_at: string
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const projectResult = await db.query<ProjectRow>(
    "SELECT id, title, description, created_at, updated_at FROM projects WHERE id = $1",
    [projectId]
  )

  if (projectResult.rowCount === 0) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  const sourcesResult = await db.query<SourceRow>(
    "SELECT id, project_id, path, content, bucket, object_key, created_at, updated_at FROM project_sources WHERE project_id = $1 ORDER BY path ASC",
    [projectId]
  )

  const sources = await Promise.all(
    sourcesResult.rows.map(async (source) => {
      if (source.object_key) {
        const content = await getTextObject(source.object_key)
        return { ...source, content: content ?? "" }
      }

      if (source.content) {
        const objectKey = `projects/${source.project_id}/${source.path}`
        await uploadTextObject(objectKey, source.content)
        await db.query(
          "UPDATE project_sources SET bucket = $1, object_key = $2, content = $3 WHERE id = $4",
          [getBucketName(), objectKey, null, source.id]
        )
        return { ...source, content: source.content, object_key: objectKey }
      }

      return { ...source, content: "" }
    })
  )

  return NextResponse.json({
    project: projectResult.rows[0],
    sources,
  })
}
