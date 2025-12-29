import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getBucketName, uploadTextObject } from "@/lib/storage"

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
