import { promises as fs } from "fs"
import { spawn } from "child_process"
import path from "path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const COMPILE_TIMEOUT_MS = 15_000
const LATEX_MAX_BYTES = 5 * 1024 * 1024 // 5 MB input guard

// ── In-memory rate limiter ────────────────────────────────────────────────────
// 10 compilations per IP per minute. Resets per window (not sliding).
const RATE_LIMIT_MAX = 10
const RATE_WINDOW_MS = 60_000

type RateBucket = { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now }
  }

  bucket.count++
  return { allowed: true, retryAfterMs: 0 }
}

// Prune stale buckets periodically to avoid unbounded map growth.
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) rateBuckets.delete(key)
  }
}, RATE_WINDOW_MS)
// ─────────────────────────────────────────────────────────────────────────────

async function ensureTempDir() {
  const root = path.join(process.cwd(), ".latex-tmp")
  await fs.mkdir(root, { recursive: true })
  return fs.mkdtemp(path.join(root, "job-"))
}

function runPdflatexLocal(workDir: string, texPath: string) {
  return new Promise<void>((resolve, reject) => {
    const args: string[] = [
      "-no-shell-escape",
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory",
      workDir,
      texPath,
    ]
    const child = spawn("pdflatex", args, { cwd: workDir })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      reject(new Error("LaTeX compile timed out."))
    }, COMPILE_TIMEOUT_MS)

    child.stdout.on("data", (data) => { stdout += data.toString() })
    child.stderr.on("data", (data) => { stderr += data.toString() })
    child.on("error", (error) => { clearTimeout(timer); reject(error) })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code === 0) { resolve(); return }
      const message = [stderr, stdout].filter(Boolean).join("\n").trim()
      reject(new Error(message || "LaTeX compile failed."))
    })
  })
}

export async function POST(request: Request) {
  // Identify caller by X-Forwarded-For (set by reverse proxy) or fall back.
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = (forwarded ? forwarded.split(",")[0] : "unknown").trim()

  const { allowed, retryAfterMs } = checkRateLimit(ip)
  if (!allowed) {
    return new NextResponse("Too many compilation requests. Try again shortly.", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + retryAfterMs) / 1000)),
      },
    })
  }

  const source = await request.text()

  if (!source.trim()) {
    return new NextResponse("Empty LaTeX input.", { status: 400 })
  }

  if (Buffer.byteLength(source, "utf8") > LATEX_MAX_BYTES) {
    return new NextResponse("LaTeX input exceeds the 5 MB limit.", { status: 400 })
  }

  const tempDir = await ensureTempDir()
  const fileBase = "main"
  const texPath = path.join(tempDir, `${fileBase}.tex`)
  const pdfPath = path.join(tempDir, `${fileBase}.pdf`)

  try {
    await fs.writeFile(texPath, source, "utf8")
    await runPdflatexLocal(tempDir, texPath)
    const pdfBuffer = await fs.readFile(pdfPath)
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LaTeX compile failed."
    return new NextResponse(message, { status: 422 })
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}
