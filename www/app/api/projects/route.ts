import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getBucketName, uploadTextObject } from "@/lib/storage"

const TITLE_MAX = 200
const DESCRIPTION_MAX = 1000

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
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { title: rawTitle, description: rawDescription } = body as Record<string, unknown>

  if (typeof rawTitle !== "string" || !rawTitle.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 })
  }

  const title = rawTitle.trim()
  if (title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: `Title must be ${TITLE_MAX} characters or fewer.` },
      { status: 400 }
    )
  }

  let description: string | null = null
  if (rawDescription != null) {
    if (typeof rawDescription !== "string") {
      return NextResponse.json({ error: "Description must be a string." }, { status: 400 })
    }
    const trimmed = rawDescription.trim()
    if (trimmed.length > DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` },
        { status: 400 }
      )
    }
    description = trimmed || null
  }

  const defaultSource = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}

\\title{Live LaTeX Preview}
\\author{Your Name}
\\maketitle

\\section{Introduction}
This is a quick example with math $E = mc^2$ and a fraction:
\\[
  \\frac{\\alpha + \\beta}{\\gamma}
\\]

\\begin{itemize}
  \\item Lists
  \\item Math inline $\\int_0^1 x^2\\,dx$
  \\item Environments like equations
\\end{itemize}

\\end{document}
`

  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const result = await client.query<ProjectRow>(
      "INSERT INTO projects (title, description) VALUES ($1, $2) RETURNING id, title, description, created_at, updated_at",
      [title, description]
    )
    const project = result.rows[0]
    const objectKey = `projects/${project.id}/main.tex`
    await uploadTextObject(objectKey, defaultSource)
    await client.query(
      "INSERT INTO project_sources (project_id, path, content, bucket, object_key) VALUES ($1, $2, $3, $4, $5)",
      [project.id, "main.tex", null, getBucketName(), objectKey]
    )
    await client.query("COMMIT")
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
