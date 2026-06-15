import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ProjectRow = {
  id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

type SourceMetaRow = {
  id: string
  project_id: string
  path: string
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

  if (!UUID_RE.test(projectId)) {
    return NextResponse.json({ error: "Invalid project ID." }, { status: 400 })
  }

  try {
    const projectResult = await db.query<ProjectRow>(
      "SELECT id, title, description, created_at, updated_at FROM projects WHERE id = $1",
      [projectId]
    )

    if (projectResult.rowCount === 0) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }

    // Return only source metadata — content is fetched on demand via
    // GET /api/projects/[projectId]/sources?path=<file>
    const sourcesResult = await db.query<SourceMetaRow>(
      `SELECT id, project_id, path, bucket, object_key, created_at, updated_at
       FROM project_sources
       WHERE project_id = $1
       ORDER BY path ASC`,
      [projectId]
    )

    return NextResponse.json({
      project: projectResult.rows[0],
      sources: sourcesResult.rows,
    })
  } catch (error) {
    logger.error("GET /api/projects/[projectId] failed", {
      projectId,
      error: String(error),
    })
    return NextResponse.json({ error: "Failed to load project." }, { status: 500 })
  }
}
