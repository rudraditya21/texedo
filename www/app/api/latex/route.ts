import { promises as fs } from "fs"
import { spawn } from "child_process"
import { createHash } from "crypto"
import path from "path"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { checkRateLimit, getCachedPdf, cachePdf } from "@/lib/redis"

export const runtime = "nodejs"

const COMPILE_TIMEOUT_MS = 15_000
const LATEX_MAX_BYTES = 5 * 1024 * 1024 // 5 MB input guard
const RATE_LIMIT_MAX = 10               // kept here for response headers

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

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
    child.on("error", (err) => { clearTimeout(timer); reject(err) })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code === 0) { resolve(); return }
      const message = [stderr, stdout].filter(Boolean).join("\n").trim()
      reject(new Error(message || "LaTeX compile failed."))
    })
  })
}

export async function POST(request: Request) {
  // ── Rate limit (Redis sliding window) ─────────────────────────────────────
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = (forwarded ? forwarded.split(",")[0] : "unknown").trim()

  const { allowed, retryAfterMs } = await checkRateLimit(ip)
  if (!allowed) {
    logger.warn("LaTeX rate limit exceeded", { ip })
    return new NextResponse("Too many compilation requests. Try again shortly.", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + retryAfterMs) / 1000)),
      },
    })
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const source = await request.text()

  if (!source.trim()) {
    return new NextResponse("Empty LaTeX input.", { status: 400 })
  }

  if (Buffer.byteLength(source, "utf8") > LATEX_MAX_BYTES) {
    return new NextResponse("LaTeX input exceeds the 5 MB limit.", { status: 400 })
  }

  // ── PDF cache (Redis) ──────────────────────────────────────────────────────
  // Same source always produces the same PDF — skip compilation on cache hit.
  const sourceHash = sha256(source)
  const cached = await getCachedPdf(sourceHash)
  if (cached) {
    logger.info("LaTeX cache hit", { ip, hash: sourceHash.slice(0, 12) })
    return new NextResponse(cached, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "X-Cache": "HIT",
      },
    })
  }

  // ── Compilation ────────────────────────────────────────────────────────────
  const tempDir = await ensureTempDir()
  const fileBase = "main"
  const texPath = path.join(tempDir, `${fileBase}.tex`)
  const pdfPath = path.join(tempDir, `${fileBase}.pdf`)

  const start = Date.now()
  try {
    await fs.writeFile(texPath, source, "utf8")
    await runPdflatexLocal(tempDir, texPath)
    const pdfBuffer = await fs.readFile(pdfPath)

    // Store in cache for future requests with identical source.
    await cachePdf(sourceHash, pdfBuffer)

    logger.info("LaTeX compiled", {
      ip,
      durationMs: Date.now() - start,
      hash: sourceHash.slice(0, 12),
    })

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "X-Cache": "MISS",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LaTeX compile failed."
    logger.warn("LaTeX compile error", {
      ip,
      durationMs: Date.now() - start,
      error: message.slice(0, 500),
    })
    return new NextResponse(message, { status: 422 })
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}
