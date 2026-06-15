import { NextRequest, NextResponse } from "next/server"

// ── CORS ──────────────────────────────────────────────────────────────────────
// TEXEDO_ALLOWED_ORIGIN controls which origin may call the API.
// Defaults to same-origin only (no header → browser blocks cross-origin).
// Set to a specific origin in production, e.g. https://texedo.example.com
const ALLOWED_ORIGIN = process.env.TEXEDO_ALLOWED_ORIGIN ?? ""

function corsHeaders(origin: string | null): Record<string, string> {
  if (!ALLOWED_ORIGIN || !origin) return {}
  if (origin !== ALLOWED_ORIGIN) return {}
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
}

// ── API key auth ──────────────────────────────────────────────────────────────
// If TEXEDO_API_SECRET is set, every /api/* request must carry:
//   Authorization: Bearer <secret>
// When the variable is not set, the check is skipped (local dev mode).
const API_SECRET = process.env.TEXEDO_API_SECRET ?? ""

function isAuthenticated(request: NextRequest): boolean {
  if (!API_SECRET) return true // auth disabled — local / open mode
  const auth = request.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""
  // Constant-time comparison is not possible in edge runtime without
  // crypto.subtle, so we use a simple equality check; the secret should
  // be treated as a long random token (32+ chars) to offset this.
  return token === API_SECRET
}

// ── Middleware entry point ────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get("origin")

  // Handle CORS preflight
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }

  // Auth check on all API routes
  if (pathname.startsWith("/api/") && !isAuthenticated(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Authorization: Bearer token." },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Bearer realm="texedo"',
          ...corsHeaders(origin),
        },
      }
    )
  }

  // Pass through — attach CORS headers to API responses
  const response = NextResponse.next()
  if (pathname.startsWith("/api/")) {
    const cors = corsHeaders(origin)
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value)
    }
  }

  return response
}

export const config = {
  matcher: ["/api/:path*"],
}
